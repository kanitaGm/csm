// pages/SearchPage.tsx// pages/SearchPage.tsx
// pages/SearchPage.tsx
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  documentId,
  Timestamp,
  QueryConstraint,
  Query,
  type WhereFilterOp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../config/firebase";

function parseDateString(dateStr: string) {
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function getDayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return [Timestamp.fromDate(start), Timestamp.fromDate(end)] as [Timestamp, Timestamp];
}

function normalizeString(str: string) {
  return str.trim().toLowerCase();
}


function formatTimestamp(ts: Timestamp, timeZone: string = "Asia/Bangkok") {
  const date = ts.toDate();

  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short", // Jan, Feb, ... | long
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  };

  const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";

  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

// ฟังก์ชัน formatDocumentDates ปรับใหม่ให้ใช้ timezone
function formatDocumentDates(
  doc: unknown | { [key: string]: unknown },
  timeZone: string = "Asia/Bangkok"
): unknown {
  if (Array.isArray(doc)) {
    return doc.map((d) => formatDocumentDates(d, timeZone));
  } else if (doc && typeof doc === "object") {
    const docObj = doc as { [key: string]: unknown };
    const newDoc: Record<string, unknown> = {};
    for (const key in docObj) {
      if (Object.prototype.hasOwnProperty.call(docObj, key)) {
        const value = docObj[key];
        if (value instanceof Timestamp || (typeof value === "object" && value !== null && "seconds" in value && "nanoseconds" in value)) {
          newDoc[key] = formatTimestamp(value as Timestamp, timeZone);
        } else if (typeof value === "object" && value !== null) {
          newDoc[key] = formatDocumentDates(value, timeZone);
        } else {
          newDoc[key] = value;
        }
      }
    }
    return newDoc;
  } else {
    return doc;
  }
}


function asWhereOp(op: string): WhereFilterOp {
  const allowed: WhereFilterOp[] = [
    "<",
    "<=",
    "==",
    "!=",
    ">=",
    ">",
    "array-contains",
    "in",
    "array-contains-any",
  ];
  if (allowed.includes(op as WhereFilterOp)) {
    return op as WhereFilterOp;
  }
  throw new Error(`Invalid Firestore operator: ${op}`);
}

export default function SearchPage() {
  const [data, setData] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tb = params.get("tb");
        if (!tb) {
          setError("Missing 'tb' parameter");
          return;
        }

        let q: Query<DocumentData> = collection(db, tb);
        const conditions: QueryConstraint[] = [];

        params.forEach((value, key) => {
          if (["tb", "api"].includes(key)) return;

          const opKey = key + "_op";
          const operator = params.get(opKey) || "==";

          // document ID
          if (key === "id") {
            conditions.push(where(documentId(), asWhereOp(operator), value));
            return;
          }

          // วันเดียวไม่สนเวลา
          if (/Date$/i.test(key) && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            const exactDate = parseDateString(value);
            const [startTs, endTs] = getDayRange(exactDate);
            conditions.push(where(key, ">=", startTs));
            conditions.push(where(key, "<=", endTs));
            return;
          }

          // ช่วงวัน
          const fromMatch = key.match(/(.+)From$/i);
          const toMatch = key.match(/(.+)To$/i);

          if (fromMatch) {
            const fieldName = fromMatch[1];
            const fromDate = parseDateString(value);
            conditions.push(where(fieldName, ">=", Timestamp.fromDate(fromDate)));
            return;
          }

          if (toMatch) {
            const fieldName = toMatch[1];
            const toDate = parseDateString(value);
            conditions.push(where(fieldName, "<=", Timestamp.fromDate(toDate)));
            return;
          }

          // string fields: auto-detect _normalized
          if (operator === "==") {
            // Firestore ไม่สามารถ check field ก่อน query, fallback แบบง่าย
            const normField = key + "_normalized";
            // ถ้า collection มี field _normalized ให้ใช้, ไม่มีก็ใช้ key
            // สำหรับ now: เราจะ query ทั้งสองแบบ (normalize & raw) => ใช้ key ปกติถ้าไม่มี _normalized
            conditions.push(where(normField, "==", normalizeString(value)));
            //conditions.push(where(key, "==", value)); // fallback ใช้ field จริง
            return;
          }

          // operator ปกติ: <, <=, >, >=, array-contains, in
          if (operator === "in") {
            const values = value.split(",").map((v) => v.trim());
            conditions.push(where(key, "in", values));
          } else if (operator === "array-contains") {
            conditions.push(where(key, "array-contains", value));
          } else {
            conditions.push(where(key, asWhereOp(operator), value));
          }
        });

        if (conditions.length > 0) {
          q = query(q, ...conditions);
        }

        const snapshot = await getDocs(q);
        const results: unknown[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as object) });
        });

        const formattedResults = formatDocumentDates(results);
        setData(formattedResults as unknown[]);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <pre>{JSON.stringify({ error }, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}




///ตัวอย่างการใช้งาน
//const formattedResults = formatDocumentDates(results); // ใช้ default Asia/Bangkok
//const formattedUTC = formatDocumentDates(results, "UTC"); // แสดงเวลา UTC

/**
 * ค้นหาทุก document>     /api-search?tb=companies
 * 
 * ค้นหาด้วย document ID> /api-search?tb=companies&id=0tH00YPJJieJWT0e5QKi
 * 
 * ค้นหาช่วงวันหลายฟิลด์ 
 * createDate อยู่ระหว่าง 1–14 ส.ค.
 * expiryDate ตรงกับ 31 ส.ค.
 * type = csm
 * >  /api-search?tb=companies&createDateFrom=01/08/2025&createDateTo=14/08/2025&expiryDate=31/08/2025&type=csm
 * 
 * ค้นหาแบบวันเดียวไม่สนเวลา * จะค้นหา updatedAt ทั้งวัน 14 ส.ค. โดยไม่สนเวลา
 *  > /api-search?tb=companies&updatedAt=14/08/2025
 * 
 * ค้นหา string ไม่สนตัวเล็กตัวใหญ่ / space / ภาษาไทย
 * รองรับ operator จาก URL query string เช่น:
 * <, <=, >, >= → ช่วงตัวเลขหรือวันที่
 * array-contains → ตรวจสอบว่า array มี element นั้นหรือไม่
 * in → ตรวจสอบว่า field อยู่ในชุดค่าที่ส่งมา
 * /api-search?tb=companies
    &name_op===&name=บริษัท เอพีพี
    &type_op=in&type=csm,other
    &updatedAtFrom=01/08/2025&updatedAtTo=14/08/2025
    &tags_op=array-contains&tags=VIP

    ตัวอย่างทั้งหมด
  /search?tb=companies
  &name=xXx&name_op===               // name ไม่สน case/space/ไทย
  &type=csm                           // type ตรงตัว
  &workingArea_op===rmx               // workingArea ไม่สน case/space
  &updatedAtFrom=01/08/2025           // updatedAt >= 01/08/2025
  &updatedAtTo=14/08/2025             // updatedAt <= 14/08/2025
  &tags_op=array-contains&tags=VIP    // tags array contains 'VIP'
  &category_op=in&category=A,B,C      // category field in [A,B,C]

  /search?tb=companies&id=0tH00YPJJieJWT0e5QKi&workingArea_op===RMX



    ฟีเจอร์สำคัญของเวอร์ชันนี้
    ค้นหา document ID → id=xxx ✅
    ค้นหา string field → ถ้ามี _normalized จะใช้ normalize → รองรับ case-insensitive, space, ภาษาไทย
    ช่วงวัน / วันเดียว → รองรับ Date, DateFrom, DateTo
    operator ยืดหยุ่น → <, <=, >, >=, in, array-contains, array-contains-any
    format field date → แปลงทุก Timestamp เป็นรูปแบบ readable "12 Aug 2025, 00:30"

 */