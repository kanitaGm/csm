// 📁 src/features/test/DebugAuth.tsx - Fixed TypeScript Errors

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { FirestoreService } from '../../config/firestoreService';
import { RoleMigrationHelper, PermissionManager } from '../../types/user';
import type { Role } from '../../types/user';

type DebugData = Record<string, unknown> | null;

const DebugAuth: React.FC = () => {
    const { user, loading, error, logout } = useAuth();
    const [testEmail, setTestEmail] = useState('test@cp.com');
    const [debugInfo, setDebugInfo] = useState<DebugData>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleLogCurrentState = () => {
        const authState = {
            authContext: {
                user,
                loading,
                error,
                userRoles: user?.roles,
                userPermissions: user?.permissions
            },
            firebase: {
                currentUser: auth.currentUser,
                uid: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                displayName: auth.currentUser?.displayName
            },
            localStorage: {
                authMethod: localStorage.getItem('authMethod')
            }
        };

        console.log('🔍 [Debug] Complete Auth State:', authState);
        setDebugInfo(authState);
    };

    const handleTestUserLookup = async () => {
        try {
            console.log(`🧪 [Debug] Testing user lookup for: ${testEmail}`);
            const permissions = await FirestoreService.getUserPermissionsByEmail(testEmail);

            if (permissions) {
                console.log('✅ [Debug] User found:', permissions);

                let migratedRoles: Role[];
                if (Array.isArray(permissions?.roles)) {
                    migratedRoles = permissions.roles;
                } else {
                    migratedRoles = RoleMigrationHelper.toArray(permissions?.roles ) || [];                    
                }

                const combinedPermissions = PermissionManager.combinePermissions(migratedRoles);

                setDebugInfo({
                    userFound: true,
                    originalData: permissions,
                    migratedRoles,
                    combinedPermissions,
                    canEvaluateCSM: PermissionManager.hasPermission(
                        migratedRoles,
                        'csm',
                        'canEvaluate'
                    )
                });
            } else {
                console.log('❌ [Debug] User not found');
                setDebugInfo({ userFound: false, email: testEmail });
            }
        } catch (err) {
            console.error('❌ [Debug] Lookup failed:', err);
            setDebugInfo({
                error: err instanceof Error ? err.message : String(err)
            });
        }
    };

    const handleClearAuth = async () => {
        try {
            localStorage.clear();
            await logout();
            window.location.reload();
        } catch (err) {
            console.error('Error clearing auth:', err);
        }
    };

    const handleTestRoleChecking = () => {
        if (!user?.roles) {
            console.log('❌ No user roles to test');
            return;
        }

        const userRoles: Role[] = Array.isArray(user.roles)
            ? user.roles
            : [user.roles];

        const testCases: { required: Role[]; description: string }[] = [
            { required: ['admin'], description: 'Admin access' },
            { required: ['csmAuditor'], description: 'CSM Auditor access' },
            { required: ['superAdmin'], description: 'Super Admin access' },
            { required: ['csmAuditor', 'auditor'], description: 'CSM or Auditor access' }
        ] as const;

        console.log('🧪 [Debug] Testing role access for roles:', userRoles);

        testCases.forEach(testCase => {
            const hasAccess = PermissionManager.checkRoleHierarchy(
                userRoles,
                testCase.required 
            );
            console.log(`${hasAccess ? '✅' : '❌'} ${testCase.description}: ${hasAccess}`);
        });

        const canEvaluate = PermissionManager.hasPermission(userRoles, 'csm', 'canEvaluate');
        const canApprove = PermissionManager.hasPermission(userRoles, 'csm', 'canApprove');
        const canManageVendors = PermissionManager.hasPermission(userRoles, 'csm', 'canManageVendors');

        console.log('🔐 [Debug] CSM Permissions:', {
            canEvaluate,
            canApprove,
            canManageVendors
        });
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="fixed z-50 px-3 py-2 text-white bg-blue-500 rounded shadow-lg top-4 right-4 hover:bg-blue-600"
            >
                🔧 Debug
            </button>
        );
    }

    return (
        <div className="fixed z-50 max-w-md p-4 overflow-y-auto bg-white border rounded-lg shadow-2xl top-4 right-4 max-h-96">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">🔧 Auth Debug</h3>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-3 text-sm">
                {/* Current Status */}
                <div className="p-2 rounded bg-gray-50">
                    <div className="mb-1 font-semibold">Status:</div>
                    <div
                        className={`${
                            loading
                                ? 'text-yellow-600'
                                : user
                                ? 'text-green-600'
                                : 'text-red-600'
                        }`}
                    >
                        {loading ? '⏳ Loading' : user ? '✅ Logged In' : '❌ Not Logged In'}
                    </div>

                    {user && (
                        <div className="mt-2 space-y-1">
                            <div>Email: {user.email}</div>
                            <div>EmpId: {user.empId}</div>
                            <div>
                                Roles:{' '}
                                {Array.isArray(user.roles)
                                    ? user.roles.join(', ')
                                    : user.roles}
                            </div>
                            <div>LoginType: {user.loginType}</div>
                        </div>
                    )}

                    {error && <div className="mt-2 text-red-600">Error: {String(error)}</div>}
                </div>

                {/* Test User Lookup */}
                <div className="p-2 rounded bg-gray-50">
                    <div className="mb-1 font-semibold">Test User Lookup:</div>
                    <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full p-1 mb-2 border rounded"
                        placeholder="Enter email to test"
                    />
                    <button
                        onClick={handleTestUserLookup}
                        className="px-2 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                    >
                        Test Lookup
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleLogCurrentState}
                        className="px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600"
                    >
                        Log State
                    </button>
                    <button
                        onClick={handleTestRoleChecking}
                        className="px-2 py-1 text-xs text-white bg-purple-500 rounded hover:bg-purple-600"
                        disabled={!user}
                    >
                        Test Roles
                    </button>
                    <button
                        onClick={handleClearAuth}
                        className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                    >
                        Clear Auth
                    </button>
                    <button
                        onClick={() => setDebugInfo(null)}
                        className="px-2 py-1 text-xs text-white bg-gray-500 rounded hover:bg-gray-600"
                    >
                        Clear Info
                    </button>
                </div>

                {/* Debug Info Display */}
                {debugInfo && (
                    <div className="p-2 rounded bg-yellow-50">
                        <div className="mb-1 font-semibold">Debug Info:</div>
                        <pre className="overflow-x-auto text-xs whitespace-pre-wrap">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Quick Links */}
                <div className="space-y-1 text-xs text-gray-500">
                    <div>💡 Tips:</div>
                    <div>• Check browser console for detailed logs</div>
                    <div>• Use "Log State" to see complete auth info</div>
                    <div>• Use "Test Roles" to verify permissions</div>
                </div>
            </div>
        </div>
    );
};

export default DebugAuth;
