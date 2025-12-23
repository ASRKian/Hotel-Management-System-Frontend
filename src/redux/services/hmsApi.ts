import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const hmsApi = createApi({
  reducerPath: 'hmsApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL }),
  tagTypes: [
    "Roles",
    "SidebarLinks",
    "RoleSidebarPermission",
    "Properties",
    "PropertyFloors",
    "Staff",
    "StaffImage",
    "StaffIdProof",
  ],
  endpoints: (builder) => ({
    getAllRoles: builder.query<any, any>({
      query: () => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/roles",
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      },
      providesTags: ["Roles"]
    }),

    getSidebarLinks: builder.query<any, any>({
      query: () => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/role-sidebar-link",
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      },
      providesTags: ["SidebarLinks"]
    }),

    getAllSidebarLinks: builder.query<any, any>({
      query: () => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/sidebarLink",
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    }),

    getSidebarPermission: builder.query<any, any>({
      query: (roleId) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: `/role-sidebar-link/${roleId}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      },
      providesTags: (result, error, roleId) => [
        { type: "RoleSidebarPermission", id: roleId }
      ]
    }),

    postRoleSidebarLink: builder.mutation({
      query: ({ role_id, sidebar_link_id, can_read, can_create, can_delete }) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/role-sidebar-link",
          body: { role_id, sidebar_link_id, can_read, can_create, can_update: can_create, can_delete },
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      },
      invalidatesTags: (result, error, body) => [
        { type: "RoleSidebarPermission", id: body.role_id },
      ]
    }),

    createRole: builder.mutation({
      query: ({ roleName }) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/roles",
          method: "POST",
          body: { roleName },
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      },
      invalidatesTags: ["Roles"]
    }),

    getProperties: builder.query<any, any>({
      query: ({ page = 1, limit = 10, search = "", city = "", state = "", country = "" }) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: `/properties?page=${page}&limit=${limit}&city=${city}&state=${state}&country=${country}&search=${search}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((item: any) => ({
              type: "Properties" as const,
              id: item.id,
            })),

            { type: "Properties", id: "LIST" },
          ]
          : [{ type: "Properties", id: "LIST" }],
    }),

    updateProperties: builder.mutation<any, any>({
      query: ({ id, payload }) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: `/properties/${id}`,
          method: "PATCH",
          body: payload,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      },

      invalidatesTags: (_result, _error, arg) => [
        { type: "Properties", id: arg.id },
      ],
    }),

    addProperty: builder.mutation<any, any>({
      query: (payload) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/properties",
          method: "POST",
          body: payload,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      },
      invalidatesTags: [{ type: 'Properties', id: 'LIST' }],
    }),

    getPropertyFloors: builder.query<any, any>({
      query: (propertyId) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: `/property-floors/${propertyId}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      },

      providesTags: (result, error, propertyId) => {
        const floors = Array.isArray(result?.floors) ? result.floors : [];

        return [
          ...floors.map((floor: any) => ({
            type: "PropertyFloors" as const,
            id: `${propertyId}-${floor.floor_number}`,
          })),
          { type: "PropertyFloors", id: propertyId },
        ];
      }
    }),

    bulkUpsertPropertyFloors: builder.mutation<any, any>({
      query: (payload) => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: `/property-floors/${payload.property_id}`,
          method: "POST",
          body: payload.floors,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      },

      invalidatesTags: (result, error, { property_id }) => [
        { type: "PropertyFloors", id: property_id },
      ],
    }),

    getStaff: builder.query<any, any>({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        department,
        designation,
        status,
      }) => {
        const authToken = localStorage.getItem("authToken");

        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          search,
        });

        if (department) params.append("department", department);
        if (designation) params.append("designation", designation);
        if (status) params.append("status", status);

        return {
          url: `/staff?${params.toString()}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        };
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((s: any) => ({
              type: "Staff" as const,
              id: s.id,
            })),
            { type: "Staff", id: "LIST" },
          ]
          : [{ type: "Staff", id: "LIST" }],
    }),

    getStaffById: builder.query<any, string>({
      query: (id) => {
        const authToken = localStorage.getItem("authToken");
        return {
          url: `/staff/${id}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        };
      },

      providesTags: (_r, _e, id) => [{ type: "Staff", id }],
    }),

    addStaff: builder.mutation<any, any>({
      query: (payload) => {
        const authToken = localStorage.getItem("authToken");
        return {
          url: "/staff",
          method: "POST",
          body: payload,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        };
      },

      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),

    updateStaff: builder.mutation<any, { id: string; payload: FormData }>({
      query: ({ id, payload }) => {
        const authToken = localStorage.getItem("authToken");
        return {
          url: `/staff/${id}`,
          method: "PATCH",
          body: payload,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        };
      },

      invalidatesTags: (_r, _e, arg) => [
        { type: "Staff", id: arg.id },
        { type: "Staff", id: "LIST" },
      ],
    }),

    getStaffImage: builder.query<Blob, string>({
      query: (id) => {
        const authToken = localStorage.getItem("authToken");
        return {
          url: `/staff/${id}/image`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          responseHandler: (response) => response.blob(),
        };
      },

      providesTags: (_r, _e, id) => [{ type: "StaffImage", id }],
    }),

    getStaffIdProof: builder.query<Blob, string>({
      query: (id) => {
        const authToken = localStorage.getItem("authToken");
        return {
          url: `/staff/${id}/id-proof`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          responseHandler: (response) => response.blob(),
        };
      },

      providesTags: (_r, _e, id) => [{ type: "StaffIdProof", id }],
    }),

    getStaffByProperty: builder.query<any, any>({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        department = "",
        status = "",
        property_id
      }) => {
        const authToken = localStorage.getItem("authToken")

        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })

        if (search) params.append("search", search)
        if (department) params.append("department", department)
        if (status) params.append("status", status)

        return {
          url: `/staff/by-property/${property_id}?${params.toString()}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((staff: any) => ({
              type: "Staff" as const,
              id: staff.id,
            })),
            { type: "Staff", id: "LIST" },
          ]
          : [{ type: "Staff", id: "LIST" }],
    }),

  }),
})

export const { useLazyGetAllRolesQuery, useLazyGetSidebarLinksQuery, useLazyGetAllSidebarLinksQuery, useLazyGetSidebarPermissionQuery, useGetSidebarPermissionQuery, usePostRoleSidebarLinkMutation, useCreateRoleMutation, useGetPropertiesQuery, useUpdatePropertiesMutation, useAddPropertyMutation, useGetPropertyFloorsQuery, useLazyGetPropertyFloorsQuery, useBulkUpsertPropertyFloorsMutation, useGetStaffQuery, useGetStaffByIdQuery, useAddStaffMutation, useUpdateStaffMutation, useGetStaffImageQuery, useGetStaffIdProofQuery, useGetStaffByPropertyQuery, useLazyGetStaffByPropertyQuery,useLazyGetStaffByIdQuery } = hmsApi