import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const hmsApi = createApi({
  reducerPath: 'hmsApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL }),
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
    }),

    getSidebarLinks: builder.query<any, any>({
      query: () => {
        const authToken = localStorage.getItem("authToken")
        return {
          url: "/roleSidebarLink",
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
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
        console.log("🚀 ~ roleId:", roleId)
        const authToken = localStorage.getItem("authToken")
        return {
          url: `/roleSidebarLink/${roleId}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    })

  }),
})

export const { useLazyGetAllRolesQuery, useLazyGetSidebarLinksQuery, useLazyGetAllSidebarLinksQuery, useLazyGetSidebarPermissionQuery, useGetSidebarPermissionQuery } = hmsApi