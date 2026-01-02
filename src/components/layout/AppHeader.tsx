import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

type Props = {
    user?: {
        name?: string;
        email?: string;
        avatar_url?: string;
    };
};

export default function AppHeader({ user }: Props) {
    const initials = (() => {
        if (!user?.name) return "U";

        const parts = user.name.trim().split(/\s+/);

        if (parts.length === 1) {
            return parts[0][0].toUpperCase();
        }

        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    })();

    return (
        <header className="sticky top-0 z-50 h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
            {/* Logo (Left) */}
            <div className="flex items-center gap-2 cursor-pointer ml-12">
                <img
                    src={atithiflowLogo}
                    alt="AtithiFlow"
                    className="h-8 w-auto"
                />
            </div>

            {/* User Menu (Right) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                            {user?.avatar_url ? (
                                <AvatarImage src={user.avatar_url} />
                            ) : (
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            )}
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
