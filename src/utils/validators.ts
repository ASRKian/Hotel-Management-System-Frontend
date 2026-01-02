const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phoneRegex = /^(\+?\d{1,3}[- ]?)?[0-9]{10}$/;

export function validateStaff(staff: any, mode: "add" | "edit", isSuperAdmin: boolean) {
    if (!staff.first_name?.trim()) return "First name is required";
    if (!staff.last_name?.trim()) return "Last name is required";

    if (!staff.email?.trim()) return "Email is required";
    if (!emailRegex.test(staff.email)) return "Invalid email address";

    if (!staff.phone1?.trim()) return "Phone number is required";
    if (!phoneRegex.test(staff.phone1)) return "Invalid phone number";

    if (mode === "add") {
        if (!staff.password?.trim()) return "Password is required";
        // if (staff.password.length < 6) return "Password must be at least 6 characters";
    }

    if (!staff.property_id && !isSuperAdmin) return "Please select a property";
    if (!staff.role_ids || staff.role_ids.length === 0) return "Please select a role";

    return null;
}
