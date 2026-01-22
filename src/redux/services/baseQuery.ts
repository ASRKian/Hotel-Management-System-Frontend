import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError, } from "@reduxjs/toolkit/query/react";
import { logout } from "../slices/isLoggedInSlice";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
    },
});

export const baseQueryWithErrorHandler: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    
    if (result.error) {
        const status = result.error.status;

        switch (status) {
            case 401:
                console.warn("401 - Unauthorized");
                api.dispatch(logout());
                break;

            case 403:
                console.warn("403 - Forbidden");
                break;

            case 500:
                console.error("500 - Server error");
                break;

            default:
                console.error("API Error:", result.error);
        }
    }

    return result;
};
