import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { hmsApi } from './services/hmsApi'
import isLoggedInSlice from './slices/isLoggedInSlice'

export const store = configureStore({
    reducer: {
        [hmsApi.reducerPath]: hmsApi.reducer,
        isLoggedIn: isLoggedInSlice
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(hmsApi.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
