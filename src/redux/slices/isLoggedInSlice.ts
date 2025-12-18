import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
    value: boolean
}

const initialState: AuthState = {
    value: true,
}

export const isLoggedInSlice = createSlice({
    name: 'counter',
    initialState,
    reducers: {
        changeLoginStatus: (state, action: PayloadAction<boolean>) => {
            state.value = action.payload
        }
    },
})

export const { changeLoginStatus } = isLoggedInSlice.actions

export default isLoggedInSlice.reducer