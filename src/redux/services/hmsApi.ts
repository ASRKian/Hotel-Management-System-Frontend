import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { baseQueryWithErrorHandler } from './baseQuery'

export const hmsApi = createApi({
  reducerPath: 'hmsApi',
  baseQuery: baseQueryWithErrorHandler,
  tagTypes: [
    "Roles",
    "SidebarLinks",
    "RoleSidebarPermission",
    "Properties",
    "PropertyFloors",
    "Staff",
    "StaffImage",
    "StaffIdProof",
    "Me",
    "Users",
    "Rooms",
    "Staff",
    "Package",
    "AvailableRooms",
    "Bookings",
    "Vehicles",
    "Guests",
    "Payments",
    "roomTypes",
    "Vendors",
    "LaundryPricing",
    "LaundryOrders",
    "Enquiries",
    "Menu",
    "Orders",
    "Tables",
    "Kitchen"
  ],
  endpoints: (builder) => ({

    getMe: builder.query<any, void>({
      query: () => {
        return {
          url: "/users/me",
          method: "GET",
        }
      },
      providesTags: ["Me"]
    }),

    createUser: builder.mutation<any, any>({
      query: ({ email, password, role_ids }) => {
        return {
          url: "/users",
          method: "POST",
          body: { email, password, role_ids },
        }
      }
    }),

    getUsersByRole: builder.query<any, any>({
      query: (role = "ADMIN") => {
        return {
          url: `/users/by-role/${role}`,
          method: "GET",
        }
      }
    }),

    getUsersByPropertyAndRole: builder.query<any, any>({
      query: ({ role = "ADMIN", propertyId }) => {
        return {
          url: `/users/property/${propertyId}?role=${role}`,
          method: "GET",
        }
      }
    }),

    getAllRoles: builder.query<any, any>({
      query: () => {
        return {
          url: "/roles",
          method: "GET",
        }
      },
      providesTags: ["Roles"]
    }),

    getSidebarLinks: builder.query<any, any>({
      query: () => {
        return {
          url: "/role-sidebar-link",
          method: "GET",
        }
      },
      providesTags: ["SidebarLinks"]
    }),

    getAllSidebarLinks: builder.query<any, any>({
      query: () => {
        return {
          url: "/sidebar-link",
          method: "GET",
        }
      }
    }),

    getSidebarPermission: builder.query<any, any>({
      query: (roleId) => {
        return {
          url: `/role-sidebar-link/${roleId}`,
          method: "GET",
        }
      },
      providesTags: (result, error, roleId) => [
        { type: "RoleSidebarPermission", id: roleId }
      ]
    }),

    postRoleSidebarLink: builder.mutation({
      query: ({ role_id, sidebar_link_id, can_read, can_create, can_delete }) => {
        return {
          url: "/role-sidebar-link",
          body: { role_id, sidebar_link_id, can_read, can_create, can_update: can_create, can_delete },
          method: "POST",
        }
      },
      invalidatesTags: (result, error, body) => [
        { type: "RoleSidebarPermission", id: body.role_id },
      ]
    }),

    createRole: builder.mutation({
      query: ({ roleName }) => {
        return {
          url: "/roles",
          method: "POST",
          body: { roleName },
        }
      },
      invalidatesTags: ["Roles"]
    }),

    getProperties: builder.query<any, any>({
      query: ({ page = 1, limit = 10, search = "", city = "", state = "", country = "" }) => {
        return {
          url: `/properties?page=${page}&limit=${limit}&city=${city}&state=${state}&country=${country}&search=${search}`,
          method: "GET",
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

    getMyProperties: builder.query<any, any>({
      query: () => {
        return {
          url: `/properties/get-my-properties`,
          method: "GET",
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

    getPropertyAddressByUser: builder.query<any, any>({
      query: () => {
        return {
          url: `/properties/address`,
          method: "GET",
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
        return {
          url: `/properties/${id}`,
          method: "PATCH",
          body: payload,
        }
      },

      invalidatesTags: (_result, _error, arg) => [
        { type: "Properties", id: arg.id },
      ],
    }),

    addProperty: builder.mutation<any, any>({
      query: (payload) => {
        return {
          url: "/properties",
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: [{ type: 'Properties', id: 'LIST' }],
    }),

    addPropertyBySuperAdmin: builder.mutation<any, any>({
      query: (payload) => {
        const owner_user_id = payload.get("owner_user_id")
        return {
          url: `properties/by-owner/${owner_user_id}`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: [{ type: 'Properties', id: 'LIST' }],
    }),

    getPropertyFloors: builder.query<any, any>({
      query: (propertyId) => {
        return {
          url: `/property-floors/${propertyId}`,
          method: "GET",
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
        return {
          url: `/property-floors/${payload.property_id}`,
          method: "POST",
          body: payload,
        }
      },

      invalidatesTags: (result, error, { property_id }) => [
        { type: "PropertyFloors", id: property_id },
      ],
    }),

    bulkUpsertRooms: builder.mutation({
      query: (payload) => {
        return {
          url: `/rooms`,
          method: "POST",
          body: payload,
        }
      }
    }),

    bulkUpdateRooms: builder.mutation({
      query: (payload) => {
        return {
          url: `/rooms`,
          method: "PATCH",
          body: payload,
        }
      },
      invalidatesTags: ["Rooms"]
    }),

    getRooms: builder.query({
      query: (propertyId) => {
        return {
          url: `/rooms?propertyId=${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Rooms"]
    }),

    getRoomsByBooking: builder.query({
      query: (bookingId) => {
        return {
          url: `/rooms/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Rooms"]
    }),

    addRoom: builder.mutation({
      query: (payload) => {
        return {
          url: `/rooms/single-room`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["Rooms"]
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
        ;

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
        ;
        return {
          url: `/staff/${id}`,
          method: "GET",
        };
      },

      providesTags: (_r, _e, id) => [{ type: "Staff", id }],
    }),

    addStaff: builder.mutation<any, any>({
      query: (payload) => {
        ;
        return {
          url: "/staff",
          method: "POST",
          body: payload,
        };
      },

      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),

    updateStaff: builder.mutation<any, { id: string; payload: FormData }>({
      query: ({ id, payload }) => {
        ;
        return {
          url: `/staff/${id}`,
          method: "PATCH",
          body: payload,
        };
      },

      invalidatesTags: (_r, _e, arg) => [
        { type: "Staff", id: arg.id },
        { type: "Staff", id: "LIST" },
      ],
    }),

    getStaffImage: builder.query<Blob, string>({
      query: (id) => {
        ;
        return {
          url: `/staff/${id}/image`,
          method: "GET",
          responseHandler: (response) => response.blob(),
        };
      },

      providesTags: (_r, _e, id) => [{ type: "StaffImage", id }],
    }),

    getStaffIdProof: builder.query<Blob, string>({
      query: (id) => {
        ;
        return {
          url: `/staff/${id}/id-proof`,
          method: "GET",
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

    getPackageById: builder.query({
      query: ({ packageId }) => {
        return {
          url: `/packages/${packageId}`,
          method: "GET",
        }
      }
    }),

    getPackagesByProperty: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/packages?property_id=${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Package"]
    }),

    createPackage: builder.mutation({
      query: (payload) => {
        return {
          url: `/packages`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["Package"]
    }),

    getPackagesByUser: builder.query({
      query: (payload) => {
        return {
          url: `/packages/user`,
          method: "GET",
        }
      },
    }),

    updatePackage: builder.mutation({
      query: ({ payload, packageId }) => {
        return {
          url: `/packages/${packageId}`,
          method: "PATCH",
          body: payload,
        }
      },
      invalidatesTags: ["Package"]
    }),

    updatePackagesBulk: builder.mutation({
      query: ({ packages, propertyId }) => {
        return {
          url: `/packages/property/${propertyId}`,
          method: "PUT",
          body: packages,
        }
      },
      invalidatesTags: ["Package"]
    }),

    deactivatePackage: builder.mutation({
      query: (packageId) => {
        return {
          url: `/packages/${packageId}`,
          method: "DELETE",
        }
      }
    }),

    availableRooms: builder.query({
      query: ({ propertyId, arrivalDate, departureDate }) => {
        return {
          url: `/rooms/available?propertyId=${propertyId}&arrivalDate=${arrivalDate}&departureDate=${departureDate}`,
          method: "GET",
        }
      },
      providesTags: ["AvailableRooms"]
    }),

    roomsStatus: builder.query({
      query: ({ date, propertyId }) => {
        return {
          url: `/rooms/status/property/${propertyId}?date=${date}`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    todayInHouseBookingIds: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/bookings/${propertyId}/today-in-house-bookings`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    createBooking: builder.mutation({
      query: (payload) => {
        return {
          url: `/bookings`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["AvailableRooms"]
    }),

    getPropertyTax: builder.query({
      query: (propertyId) => {
        return {
          url: `/properties/${propertyId}/tax`,
          method: "GET",
        }
      }
    }),

    getPropertyBanks: builder.query({
      query: (propertyId) => {
        return {
          url: `/property-banks/property/${propertyId}`,
          method: "GET",
        }
      }
    }),

    upsertPropertyBanks: builder.mutation({
      query: ({ propertyId, accounts, deletedIds }) => {
        return {
          url: `/property-banks/property/${propertyId}`,
          method: "POST",
          body: { accounts, deletedIds }
        }
      }
    }),

    getBookings: builder.query({
      query: ({ page = 1, limit = 10, propertyId, fromDate, toDate, scope, status }) => {
        return {
          url: `/bookings?propertyId=${propertyId}&fromDate=${fromDate}&toDate=${toDate}&page=${page}&limit=${limit}&scope=${scope}&status=${status}`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    getBookingById: builder.query({
      query: (bookingId) => {
        return {
          url: `/bookings/${bookingId}`,
          method: "GET",
        }
      }
    }),

    updateBooking: builder.mutation({
      query: ({ booking_id, status }) => {
        return {
          url: `/bookings/${booking_id}/status`,
          method: "PATCH",
          body: { status },
        }
      },
      invalidatesTags: ["Bookings"]
    }),

    cancelBooking: builder.mutation({
      query: ({ booking_id, cancellation_fee, comments }) => {
        return {
          url: `/bookings/${booking_id}/cancel`,
          method: "PATCH",
          body: { cancellation_fee, comments },
        }
      },
      invalidatesTags: ["Bookings"]
    }),

    addGuestsByBooking: builder.mutation({
      query: ({ bookingId, formData }) => {
        return {
          url: `/bookings/${bookingId}/guests`,
          method: "POST",
          body: formData,
        }
      },
      invalidatesTags: ["Guests", "Bookings"]
    }),

    getGuestsByBooking: builder.query({
      query: ({ booking_id }) => {
        return {
          url: `/bookings/${booking_id}/guests`,
          method: "GET",
        }
      },
      providesTags: ["Guests"]
    }),

    updateGuests: builder.mutation({
      query: ({ bookingId, formData }) => {
        return {
          url: `/bookings/${bookingId}/guests`,
          method: "PUT",
          body: formData,
        }
      },
      invalidatesTags: ["Guests"]
    }),

    addVehicles: builder.mutation({
      query: ({ bookingId, vehicles }) => {
        return {
          url: `/bookings/${bookingId}/vehicles`,
          method: "POST",
          body: { vehicles },
        }
      },
      invalidatesTags: ["Vehicles"]
    }),

    getVehiclesByBooking: builder.query({
      query: ({ bookingId }) => {
        return {
          url: `/bookings/${bookingId}/vehicles`,
          method: "GET",
        }
      },
      providesTags: ["Vehicles"]
    }),

    getPaymentsByProperty: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/payments/property/${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Payments"]
    }),

    getPaymentsById: builder.query({
      query: ({ paymentId }) => {
        return {
          url: `/payments/${paymentId}`,
          method: "GET",
        }
      },
      providesTags: ["Payments"]
    }),

    getPaymentsByBookingId: builder.query({
      query: ({ bookingId }) => {
        return {
          url: `/payments/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Payments"]
    }),

    createPayment: builder.mutation({
      query: ({ payload }) => {
        return {
          url: `/payments`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["Payments"]
    }),

    getRoomTypes: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/room-type-rates/${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["roomTypes"]
    }),

    updateRoomTypes: builder.mutation({
      query: ({ payload }) => {
        return {
          url: `/room-type-rates`,
          method: "PUT",
          body: payload,
        }
      },
      invalidatesTags: ["roomTypes"]
    }),

    getPropertyVendors: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/vendors/property/${propertyId}?page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["Vendors"]
    }),

    getAllPropertyVendors: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/vendors/all/property/${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Vendors"]
    }),

    createVendor: builder.mutation({
      query: (payload) => {
        return {
          url: `/vendors`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Vendors"]
    }),

    updateVendor: builder.mutation({
      query: ({ vendorId, payload }) => {
        return {
          url: `/vendors/${vendorId}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Vendors"]
    }),

    getPropertyLaundryPricing: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/laundries/property/${propertyId}?page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["LaundryPricing"]
    }),

    createLaundryPricing: builder.mutation({
      query: (payload) => {
        return {
          url: `/laundries`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["LaundryPricing"]
    }),

    updateLaundryPricing: builder.mutation({
      query: (payload) => {
        return {
          url: `/laundries`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["LaundryPricing"]
    }),

    getPropertyLaundryOrders: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/laundries/orders/property/${propertyId}?page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["LaundryOrders"]
    }),

    getBookingLaundryOrders: builder.query({
      query: (bookingId) => {
        return {
          url: `/laundries/orders/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["LaundryOrders"]
    }),

    createLaundryOrder: builder.mutation({
      query: (payload) => {
        return {
          url: `/laundries/orders`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["LaundryOrders"]
    }),

    updateLaundryOrder: builder.mutation({
      query: ({ id, laundryStatus }) => {
        return {
          url: `/laundries/orders/${id}`,
          method: "PUT",
          body: { laundryStatus }
        }
      },
      invalidatesTags: ["LaundryOrders"]
    }),

    getPropertyEnquiries: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/enquiries?propertyId=${propertyId}&page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["Enquiries"]
    }),

    createEnquiry: builder.mutation({
      query: (payload) => {
        return {
          url: `/enquiries`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Enquiries"]
    }),

    updateEnquiry: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/enquiries/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Enquiries"]
    }),

    getPropertyMenu: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/menu/property/${propertyId}?page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["Menu"]
    }),

    getPropertyMenuLight: builder.query({
      query: (propertyId) => {
        return {
          url: `/menu/property/${propertyId}/light`,
          method: "GET",
        }
      },
      providesTags: ["Menu"]
    }),

    createMenuItem: builder.mutation({
      query: (payload) => {
        return {
          url: `/menu`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Menu"]
    }),

    updateMenuItem: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/menu/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Menu"]
    }),

    getPropertyOrders: builder.query({
      query: ({ propertyId, page, status }) => {
        return {
          url: `/orders/property/${propertyId}?page=${page}&status=${status}`,
          method: "GET",
        }
      },
      providesTags: ["Orders"]
    }),

    getOrderById: builder.query({
      query: (id) => {
        return {
          url: `/orders/${id}`,
          method: "GET",
        }
      },
      providesTags: ["Orders"]
    }),

    getOrderByBooking: builder.query({
      query: (bookingId) => {
        return {
          url: `/orders/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Orders"]
    }),

    createOrder: builder.mutation({
      query: (payload) => {
        return {
          url: `/orders`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Orders", "Bookings"]
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/orders/${id}/status`,
          method: "PATCH",
          body: payload
        }
      },
      invalidatesTags: ["Orders", "Bookings"]
    }),

    updateOrderPayment: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/orders/${id}/payment`,
          method: "PATCH",
          body: payload
        }
      },
      invalidatesTags: ["Orders"]
    }),

    getRestaurantTable: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/tables/property/${propertyId}?page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["Tables"]
    }),

    getRestaurantTablesLight: builder.query({
      query: (propertyId) => {
        return {
          url: `/tables/property/${propertyId}/light`,
          method: "GET",
        }
      },
      providesTags: ["Tables"]
    }),

    createRestaurantTable: builder.mutation({
      query: (payload) => {
        return {
          url: `/tables`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Tables"]
    }),

    updateRestaurantTable: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/tables/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Tables"]
    }),

    getKitchenInventory: builder.query({
      query: ({ propertyId, page }) => {
        return {
          url: `/kitchen/property/${propertyId}?page=${page}`,
          method: "GET",
        }
      },
      providesTags: ["Kitchen"]
    }),

    createInventory: builder.mutation({
      query: (payload) => {
        return {
          url: `/kitchen`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen"]
    }),

    updateInventory: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/kitchen/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen"]
    }),

    updateInventoryBulk: builder.mutation({
      query: (payload) => {
        return {
          url: `/kitchen/bulk`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen"]
    }),

    getLogs: builder.query({
      query: ({ tableName, eventId }) => {
        return {
          url: `/audits?eventId=${eventId}&tableName=${tableName}`,
          method: "GET",
        }
      },
    }),
  }),
})

export const { useLazyGetAllRolesQuery, useLazyGetSidebarLinksQuery, useLazyGetAllSidebarLinksQuery, useLazyGetSidebarPermissionQuery, useGetSidebarPermissionQuery, usePostRoleSidebarLinkMutation, useCreateRoleMutation, useGetPropertiesQuery, useUpdatePropertiesMutation, useAddPropertyMutation, useAddPropertyBySuperAdminMutation, useGetPropertyFloorsQuery, useLazyGetPropertyFloorsQuery, useBulkUpsertPropertyFloorsMutation, useGetStaffQuery, useGetStaffByIdQuery, useAddStaffMutation, useUpdateStaffMutation, useGetStaffImageQuery, useGetStaffIdProofQuery, useGetStaffByPropertyQuery, useLazyGetStaffByPropertyQuery, useLazyGetStaffByIdQuery, useGetMeQuery, useLazyGetMeQuery, useLazyGetUsersByRoleQuery, useGetAllRolesQuery, useCreateUserMutation, useGetMyPropertiesQuery, useGetRoomsQuery, useBulkUpdateRoomsMutation, useBulkUpsertRoomsMutation, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useCreatePackageMutation, useUpdatePackageMutation, useDeactivatePackageMutation, useAddRoomMutation, useGetPackagesByUserQuery, useAvailableRoomsQuery, useCreateBookingMutation, useGetPropertyTaxQuery, useGetBookingByIdQuery, useGetBookingsQuery, useCancelBookingMutation, useUpdateBookingMutation, useAddGuestsByBookingMutation, useGetGuestsByBookingQuery, useUpdateGuestsMutation, useAddVehiclesMutation, useGetVehiclesByBookingQuery, useGetPropertyAddressByUserQuery, useGetPaymentsByPropertyQuery, useGetPaymentsByIdQuery, useGetPaymentsByBookingIdQuery, useCreatePaymentMutation, useGetRoomTypesQuery, useUpdateRoomTypesMutation, useLazyGetUsersByPropertyAndRoleQuery, useRoomsStatusQuery, useUpdatePackagesBulkMutation, useGetPropertyBanksQuery, useUpsertPropertyBanksMutation, useGetPropertyVendorsQuery, useCreateVendorMutation, useUpdateVendorMutation, useGetPropertyLaundryPricingQuery, useCreateLaundryPricingMutation, useUpdateLaundryPricingMutation, useGetPropertyLaundryOrdersQuery, useCreateLaundryOrderMutation, useUpdateLaundryOrderMutation, useGetPropertyEnquiriesQuery, useCreateEnquiryMutation, useUpdateEnquiryMutation, useGetAllPropertyVendorsQuery, useTodayInHouseBookingIdsQuery, useGetPropertyMenuQuery, useCreateMenuItemMutation, useUpdateMenuItemMutation, useGetPropertyMenuLightQuery, useGetPropertyOrdersQuery, useGetOrderByIdQuery, useCreateOrderMutation, useUpdateOrderPaymentMutation, useUpdateOrderStatusMutation, useGetRestaurantTableQuery, useCreateRestaurantTableMutation, useUpdateRestaurantTableMutation, useGetRestaurantTablesLightQuery, useGetKitchenInventoryQuery, useCreateInventoryMutation, useUpdateInventoryBulkMutation, useUpdateInventoryMutation, useGetBookingLaundryOrdersQuery, useGetLogsQuery, useGetRoomsByBookingQuery, useGetOrderByBookingQuery, useGetSidebarLinksQuery } = hmsApi