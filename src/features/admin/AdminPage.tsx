// =================================================================
// srv/pages/AdminPage.tsx
// =================================================================
import React from 'react';

const AdminPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <p>เฉพาะ Superadmin และ Admin เท่านั้นที่เห็นหน้านี้</p>
    </div>
  );
};

export default AdminPage;
