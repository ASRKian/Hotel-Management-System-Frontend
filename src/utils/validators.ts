const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phoneRegex = /^(\+?\d{1,3}[- ]?)?[0-9]{10}$/;

export function validateStaff(staff: any, mode: "add" | "edit", isSuperAdmin: boolean) {
    if (!staff.first_name?.trim()) return "First name is required";
    if (!staff.last_name?.trim()) return "Last name is required";

    if (!staff.email?.trim()) return "Email is required";
    if (!emailRegex.test(staff.email)) return "Invalid email address";

    if (!staff.phone1?.trim()) return "Phone number is required";
    if (!phoneRegex.test(staff.phone1)) return "Invalid phone number";
    if (!staff.emergency_contact?.trim()) return "Emergency Phone number is required";
    if (!phoneRegex.test(staff.emergency_contact)) return "Invalid Emergency contact 1 number";
    if (staff.emergency_contact_2 && !phoneRegex.test(staff.emergency_contact_2)) return "Invalid Emergency contact 2 number";

    if (!staff.emergency_contact_relation?.trim()) return "Emergency contact relation 1 is required";
    if (!staff.emergency_contact_name?.trim()) return "Emergency contact relation 1 is required";
    if (staff.emergency_contact_2 && !staff.emergency_contact_relation_2?.trim()) return "Emergency contact relation 2 is required";
    if (staff.emergency_contact_2 && !staff.emergency_contact_name_2?.trim()) return "Emergency contact name 2 is required";
    if (!staff.hire_date?.trim()) return "Joining date is required";
    if (!staff.dob?.trim()) return "Date of birth is required";
    if (!staff.gender?.trim()) return "Gender is required";
    if (!staff.marital_status?.trim()) return "Marital status is required";
    if (!staff.blood_group?.trim()) return "Blood Group is required";
    if (!staff.id_proof_type?.trim()) return "ID Proof Type is required";
    if (!staff.id_number?.trim()) return "ID Number is required";
    if (mode === "add" && !staff.id_proof) return "Please choose ID Proof";

    if (mode === "add") {
        if (!staff.password?.trim()) return "Password is required";
    }

    if (!staff.property_id && !isSuperAdmin) return "Please select a property";
    if (!staff.role_ids || staff.role_ids.length === 0) return "Please select a role";

    return null;
}
