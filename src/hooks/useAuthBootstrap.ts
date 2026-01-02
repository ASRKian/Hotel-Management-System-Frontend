import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLazyGetMeQuery } from "@/redux/services/hmsApi";
import { logout, setMeLoaded } from "@/redux/slices/isLoggedInSlice";

export function useAuthBootstrap() {
    const dispatch = useDispatch();

    const isLoggedIn = useSelector((state: any) => state.isLoggedIn.value);
    const meLoaded = useSelector((state: any) => state.isLoggedIn.meLoaded);

    const [getMe] = useLazyGetMeQuery();

    useEffect(() => {
        if (!isLoggedIn || meLoaded) return;

        (async () => {
            try {
                await getMe().unwrap();
                dispatch(setMeLoaded());
            } catch (err) {
                dispatch(logout());
            }
        })();
    }, [isLoggedIn, meLoaded]);
}
