import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
    value: boolean;
    meLoaded: boolean;
}

const initialState: AuthState = {
    value: true,
    meLoaded: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        loginSuccess: (state) => {
            state.value = true;
            state.meLoaded = false;
        },

        logout: (state) => {
            state.value = false;
            state.meLoaded = false;
            localStorage.removeItem("authToken");
        },

        setMeLoaded: (state) => {
            state.meLoaded = true;
        },

        // optional: restore session on refresh
        setLoggedInFromStorage: (state, action: PayloadAction<boolean>) => {
            state.value = action.payload;
        },
    },
});

export const {
    loginSuccess,
    logout,
    setMeLoaded,
    setLoggedInFromStorage
} = authSlice.actions;

export default authSlice.reducer;
