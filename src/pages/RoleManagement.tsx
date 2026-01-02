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
import AppHeader from "@/components/layout/AppHeader";
import { selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeTextInput } from "@/utils/normalizeTextInput";

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
    const [originalPermissions, setOriginalPermissions] = useState<Record<number, any>>({});
    const [newRolePermissions, setNewRolePermissions] = useState<
        Record<number, {
            can_read: boolean;
            can_create: boolean;
            can_update: boolean;
            can_delete: boolean;
        }>
    >({});
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);

    const [getALlRoles, { data: allRolesData, isLoading: allRolesLoading, isUninitialized: allRolesUninitialized, isError: allRolesError }] = useLazyGetAllRolesQuery()
    const [getAllSidebarLinks, { data: allSidebarLinksData, isLoading: allSidebarLinksLoading, isUninitialized: allSidebarLinksUninitialized, isError: allSidebarLinksError }] = useLazyGetAllSidebarLinksQuery()

    const {
        data: sidebarPermissionData,
    } = useGetSidebarPermissionQuery(
        selectedRoleId,
        { skip: !selectedRoleId }
    );

    const [postRoleSidebarLink] = usePostRoleSidebarLinkMutation()

    const [createRole] = useCreateRoleMutation()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)

    useEffect(() => {
        if (!isLoggedIn) return
        getALlRoles("allRoles")
        getAllSidebarLinks("allSidebarLinks")
    }, [isLoggedIn])

    useEffect(() => {
        if (!allSidebarLinksData?.roles) return;

        const initial: Record<number, any> = {};

        allSidebarLinksData.roles.forEach((m) => {
            initial[m.id] = {
                can_read: false,
                can_create: false,
                can_update: false,
                can_delete: false,
            };
        });

        setNewRolePermissions(initial);
    }, [allSidebarLinksData]);

    function onNewRolePermissionChange(
        moduleId: number,
        field: "can_read" | "can_create" | "can_update" | "can_delete",
        checked: boolean
    ) {
        setNewRolePermissions(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId],
                [field]: checked,
            }
        }));
    }

    async function addRole() {
        if (!newRoleName.trim()) return;

        try {
            const role = await createRole({
                roleName: newRoleName,
            }).unwrap();

            const roleId = role.roleId;

            const permissionPayloads = Object.entries(newRolePermissions).map(
                ([sidebarLinkId, perms]) => ({
                    role_id: roleId,
                    sidebar_link_id: Number(sidebarLinkId),
                    ...perms,
                })
            );

            const promise = Promise.all(
                permissionPayloads.map(p =>
                    postRoleSidebarLink(p).unwrap()
                )
            );

            toast.promise(promise, {
                pending: 'Creating role & adding sidebar permissions...',
                success: 'Role Creation & Sidebar permissions addition success',
                error: 'Some error occurred',
            })

            setSelectedRoleId(roleId);
            setSelectedRoleName(newRoleName);
            setNewRoleName("");
            setNewRolePermissions({});
            setIsCreateRoleOpen(false)
        } catch (err) {
            toast.error("Failed to create role");
        }
    }

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

        const permissions: Record<number, any> = {};

        sidebarPermissionData.permission.forEach(p => {
            permissions[p.sidebar_link_id] = {
                can_read: p.can_read,
                can_create: p.can_create,
                can_update: p.can_update,
                can_delete: p.can_delete,
            };
        });

        setSidebarPermissionPayload({
            roleId: selectedRoleId,
            permissions,
        });

        setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
    }, [selectedRoleId, sidebarPermissionData]);

    const isDirty = selectedRoleId
        ? JSON.stringify(originalPermissions) !==
        JSON.stringify(sidebarPermissionPayload.permissions)
        : false;

    async function sidebarPermissionUpdate(): Promise<void> {
        if (!isDirty) return;
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
            pending: 'Updating sidebar permissions...',
            success: 'Sidebar permissions updated successfully',
            error: 'Failed to update sidebar permissions',
        })

    }

    function resetPermissions() {
        setSidebarPermissionPayload(prev => ({
            ...prev,
            permissions: JSON.parse(JSON.stringify(originalPermissions)),
        }));
    }

    return (
        <div className="min-h-screen bg-background">

            {/* Page Content */}
            <AppHeader
                user={{
                    name: "",
                    email: "user@atithiflow.com",
                }}
            />
            <Sidebar />
            {/* <main className="lg:ml-64 h-screen overflow-hidden"> */}
            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

                {/* <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] h-full"> */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] flex-1 overflow-hidden">

                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Roles</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage roles available in your organization.
                                </p>
                            </div>

                            <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
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
                                                onChange={(e) => setNewRoleName(normalizeTextInput(e.target.value))}
                                                placeholder="e.g. Front Desk"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-sm">Permissions</Label>

                                            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-xl p-3">
                                                {allSidebarLinksData?.roles.map((module) => (
                                                    <div
                                                        key={module.id}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <span className="text-sm font-medium">
                                                            {module.link_name}
                                                        </span>

                                                        <div className="flex gap-4">
                                                            {PERMISSION_ACTIONS.map((action) => (
                                                                <div
                                                                    key={action.key}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <Checkbox
                                                                        checked={
                                                                            newRolePermissions[module.id]?.[action.field]
                                                                        }
                                                                        onCheckedChange={(checked) =>
                                                                            onNewRolePermissionChange(
                                                                                module.id,
                                                                                action.field,
                                                                                Boolean(checked)
                                                                            )
                                                                        }
                                                                    />
                                                                    <Label className="text-xs">
                                                                        {action.label}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
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
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 bg-muted/20">
                        {selectedRoleId ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card rounded-2xl border border-border shadow-sm p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Permissions – {selectedRoleName}
                                    </h2>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={!isDirty}
                                            onClick={resetPermissions}
                                        >
                                            Reset
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={!isSuperAdmin || !isDirty}
                                            onClick={sidebarPermissionUpdate}
                                        >
                                            Update
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {!allSidebarLinksLoading &&
                                        !allSidebarLinksError &&
                                        allSidebarLinksData.roles.map((module) => (
                                            <div
                                                key={module.id}
                                                className="flex items-center justify-between border border-border rounded-xl p-4"
                                            >
                                                <span className="font-medium text-foreground">
                                                    {module.link_name}
                                                </span>

                                                <div className="flex items-center gap-6">
                                                    {["read", "write", "delete"].map((action) => {
                                                        const permission = PERMISSION_ACTIONS.find(
                                                            (p) => p.label === action
                                                        );

                                                        if (!permission) return null;

                                                        return (
                                                            <div
                                                                key={action}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Checkbox
                                                                    checked={isChecked(
                                                                        module.id,
                                                                        permission.field
                                                                    )}
                                                                    onCheckedChange={(checked) =>
                                                                        onPermissionChange(
                                                                            module.id,
                                                                            permission.field,
                                                                            Boolean(checked)
                                                                        )
                                                                    }
                                                                />
                                                                <Label className="text-sm capitalize">
                                                                    {action}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        No role selected
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Select a role from the left to manage its permissions.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
