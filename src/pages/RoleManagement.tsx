import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useCreateRoleMutation, useGetSidebarPermissionQuery, useLazyGetAllRolesQuery, useLazyGetAllSidebarLinksQuery, usePostRoleSidebarLinkMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { toast } from "react-toastify";

const PERMISSION_ACTIONS = [
    { key: "read", label: "read", field: "can_read" },
    { key: "create", label: "write", field: "can_create" },
    { key: "delete", label: "delete", field: "can_delete" },
] as const;

type SidebarPermissionPayload = {
    roleId: string;
    permissions: {
        [sidebarLinkId: string]: {
            can_read: boolean;
            can_create: boolean;
            can_update: boolean;
            can_delete: boolean;
        };
    };
};


export default function RoleManagement() {
    const [newRoleName, setNewRoleName] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [selectedRoleName, setSelectedRoleName] = useState("")
    const [sidebarPermissionPayload, setSidebarPermissionPayload] =
        useState<SidebarPermissionPayload>({
            roleId: "",
            permissions: {}
        });
    console.log("🚀 ~ RoleManagement ~ sidebarPermissionPayload:", sidebarPermissionPayload)

    const [getALlRoles, { data: allRolesData, isLoading: allRolesLoading, isUninitialized: allRolesUninitialized, isError: allRolesError }] = useLazyGetAllRolesQuery()
    const [getAllSidebarLinks, { data: allSidebarLinksData, isLoading: allSidebarLinksLoading, isUninitialized: allSidebarLinksUninitialized, isError: allSidebarLinksError }] = useLazyGetAllSidebarLinksQuery()

    const {
        data: sidebarPermissionData,
        isFetching: sidebarPermissionLoading,
        isError: sidebarPermissionError,
    } = useGetSidebarPermissionQuery(
        selectedRoleId,
        { skip: !selectedRoleId }
    );

    const [postRoleSidebarLink, { isSuccess: postRoleSidebarSuccess, isError: postRoleSidebarError }] = usePostRoleSidebarLinkMutation()

    const [createRole, { isSuccess: createRoleSuccess, reset }] = useCreateRoleMutation()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    useEffect(() => {
        if (!isLoggedIn) return
        getALlRoles("allRoles")
        getAllSidebarLinks("allSidebarLinks")
    }, [isLoggedIn])

    function addRole() {
        if (!newRoleName.trim()) return;
        const promise = createRole({ roleName: newRoleName }).unwrap()
        toast.promise(promise, {
            pending: 'Updating sidebar permissions...',
            success: 'Sidebar permissions updated successfully',
            error: 'Failed to update sidebar permissions',
        })
        reset()
        setNewRoleName("");
    };

    function isChecked(
        moduleId: number,
        field: "can_read" | "can_create" | "can_delete"
    ) {
        return (
            sidebarPermissionPayload.permissions[moduleId]?.[field] ?? false
        );
    }

    function onPermissionChange(
        moduleId: number,
        field: "can_read" | "can_create" | "can_update" | "can_delete",
        checked: boolean
    ) {
        setSidebarPermissionPayload(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: {
                    ...prev.permissions[moduleId],
                    [field]: checked
                }
            }
        }));
    }

    useEffect(() => {
        if (!selectedRoleId || !sidebarPermissionData?.permission) return;

        const permissions = {};

        sidebarPermissionData.permission.forEach(p => {
            permissions[p.sidebar_link_id] = {
                can_read: p.can_read,
                can_create: p.can_create,
                can_update: p.can_update,
                can_delete: p.can_delete
            };
        });

        setSidebarPermissionPayload({
            roleId: selectedRoleId,
            permissions
        });
    }, [selectedRoleId, sidebarPermissionData]);

    async function sidebarPermissionUpdate(): Promise<void> {
        const { roleId, permissions } = sidebarPermissionPayload;

        const payloads = Object.entries(permissions).map(
            ([sidebarLinkId, perms]) => ({
                role_id: Number(roleId),
                sidebar_link_id: Number(sidebarLinkId),
                ...perms
            })
        );
        const updatePromise = Promise.all(
            payloads.map(p => postRoleSidebarLink(p).unwrap())
        )

        toast.promise(updatePromise, {
            pending: 'Creating role...',
            success: 'Role created successfully',
            error: 'Failed to create role',
        })

    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />

            {/* Page Content */}
            <main className="lg:ml-64 h-screen overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] h-full">
                    <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Roles</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage roles available in your organization.
                                </p>
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="hero">
                                        <Plus className="h-4 w-4 mr-2" /> Add Role
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Role</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Role Name</Label>
                                            <Input
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                                placeholder="e.g. Front Desk"
                                            />
                                        </div>
                                        <Button onClick={addRole} className="w-full" variant="hero">
                                            Create Role
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role</TableHead>
                                        {/* <TableHead>Permissions</TableHead> */}
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!allRolesLoading && !allRolesUninitialized && !allRolesError && allRolesData.roles.map((role) => {
                                        return <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name}</TableCell>
                                            {/* <TableCell className="text-sm text-muted-foreground">
                                                {role.permissions.length === 0
                                                    ? "No permissions"
                                                    : `${role.permissions.length} modules`}
                                            </TableCell> */}
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    onClick={() => {
                                                        setSelectedRoleId(role.id);
                                                        setSelectedRoleName(role.name);
                                                    }}
                                                >
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </section>

                    <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8 bg-muted/20">
                        {
                            // selectedRole ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card rounded-2xl border border-border shadow-sm p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {selectedRoleName ? "Permissions –" + selectedRoleName : "Please select role to continue"}
                                    </h2>
                                    <Button size="sm" variant="ghost" disabled>
                                        Reset
                                    </Button>
                                    <Button size="sm" variant="ghost" disabled={!selectedRoleId} onClick={sidebarPermissionUpdate} >
                                        Update
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {!allSidebarLinksLoading && !allSidebarLinksError && !allRolesUninitialized && allSidebarLinksData.roles.map((module) => (
                                        <div
                                            key={module.id}
                                            className="flex items-center justify-between border border-border rounded-xl p-4"
                                        >
                                            <span className="font-medium text-foreground">
                                                {module.link_name}
                                            </span>
                                            <div className="flex items-center gap-6">
                                                {["read", "write", "delete"].map((action) => (
                                                    <div key={action} className="flex items-center gap-2">
                                                        <Checkbox
                                                            disabled={!selectedRoleId}
                                                            checked={isChecked(module.id, PERMISSION_ACTIONS.find(p => p.label === action)?.field)}
                                                            onCheckedChange={(checked) =>
                                                                onPermissionChange(
                                                                    module.id,
                                                                    PERMISSION_ACTIONS.find(p => p.label === action)?.field,
                                                                    Boolean(checked)
                                                                )
                                                            }
                                                        />
                                                        <Label className="text-sm capitalize">{action}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                            // ) : (
                            //     <div className="h-full flex items-center justify-center text-muted-foreground">
                            //         Select a role to manage permissions
                            //     </div>
                            // )
                        }
                    </section>
                </div>
            </main>
        </div>
    );
}
