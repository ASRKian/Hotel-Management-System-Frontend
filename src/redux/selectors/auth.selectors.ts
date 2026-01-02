import { RootState } from "../store";
import { hmsApi } from "../services/hmsApi";

export const selectMeResult =
    hmsApi.endpoints.getMe.select();

export const selectMe = (state: RootState) =>
    selectMeResult(state)?.data;

export const selectUserRoles = (state: RootState) =>
    selectMe(state)?.user?.roles ?? [];

export const selectRoleSet = (state: RootState) =>
    new Set(
        selectUserRoles(state).map(r => r.name.toUpperCase())
    );

export const selectIsSuperAdmin = (state: RootState) =>
    selectRoleSet(state).has("SUPER_ADMIN");

export const selectIsOwner = (state: RootState) =>
    selectRoleSet(state).has("OWNER");

export const selectIsAdmin = (state: RootState) =>
    selectRoleSet(state).has("ADMIN");
