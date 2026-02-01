const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phoneRegex = /^(\+?\d{1,3}[- ]?)?[0-9]{10}$/;

export function validateStaff(
    staff: any,
    mode: "add" | "edit",
    isSuperAdmin: boolean,
    roles: {
        id: string;
        name: string;
    }[]
) {
    const selectedRoles = roles.filter(role =>
        staff.role_ids.includes(role.id)
    );
    const staffIsOwner = selectedRoles.some(x => x.name === "OWNER");

    /* ============================
       BASIC INFO (ALWAYS REQUIRED)
    ============================ */
    if (!staff.first_name?.trim()) return "First name is required";
    if (!staff.last_name?.trim()) return "Last name is required";

    if (!staff.email?.trim()) return "Email is required";
    if (!emailRegex.test(staff.email)) return "Invalid email address";

    if (!staff.phone1?.trim()) return "Phone number is required";
    if (!phoneRegex.test(staff.phone1)) return "Invalid phone number";

    /* ============================
       ROLE-BASED RULES
    ============================ */

    // NON-OWNER → always mandatory
    if (!staffIsOwner) {
        if (!staff.emergency_contact?.trim())
            return "Emergency Phone number is required";

        if (!staff.id_proof_type?.trim()) return "ID Proof Type is required";
        if (!staff.id_number?.trim()) return "ID Number is required";
        if (mode === "add" && !staff.id_proof) return "Please choose ID Proof";
        if (!staff.hire_date?.trim()) return "Joining date is required";
        if (!staff.dob?.trim()) return "Date of birth is required";
        if (!staff.blood_group?.trim()) return "Blood Group is required";
    }

    // OWNER → conditional emergency rule
    if (staffIsOwner) {
        const ownerStartedEmergency =
            staff.emergency_contact_relation?.trim() ||
            staff.emergency_contact_name?.trim();

        if (ownerStartedEmergency && !staff.emergency_contact?.trim()) {
            return "Emergency Phone number is required";
        }
    }

    /* ============================
       EMERGENCY CONTACT VALIDATION
    ============================ */
    if (staff.emergency_contact && !phoneRegex.test(staff.emergency_contact))
        return "Invalid Emergency contact 1 number";

    if (staff.emergency_contact_2 && !phoneRegex.test(staff.emergency_contact_2))
        return "Invalid Emergency contact 2 number";

    if (staff.emergency_contact && !staff.emergency_contact_relation?.trim())
        return "Emergency contact relation 1 is required";

    if (staff.emergency_contact && !staff.emergency_contact_name?.trim())
        return "Emergency contact name 1 is required";

    if (staff.emergency_contact_2 && !staff.emergency_contact_relation_2?.trim())
        return "Emergency contact relation 2 is required";

    if (staff.emergency_contact_2 && !staff.emergency_contact_name_2?.trim())
        return "Emergency contact name 2 is required";

    /* ============================
       NATIONALITY VALIDATION
    ============================ */
    if (!staff.nationality?.trim()) return "Nationality is required";

    /* ============================
       FOREIGNER RULES
    ============================ */
    if (staff.nationality === "foreigner") {
        if (!staff.country?.trim()) return "Country is required for foreign staff";

        if (!staff.visa_number?.trim()) return "Visa number is required";
        if (!staff.visa_issue_date?.trim()) return "Visa issue date is required";
        if (!staff.visa_expiry_date?.trim()) return "Visa expiry date is required";

        const issue = new Date(staff.visa_issue_date);
        const exp = new Date(staff.visa_expiry_date);

        if (exp <= issue) {
            return "Visa expiry date must be after visa issue date";
        }
    }

    /* ============================
       PERSONAL INFO
    ============================ */
    if (!staff.gender?.trim()) return "Gender is required";
    if (!staff.marital_status?.trim()) return "Marital status is required";

    /* ============================
       AUTH / SYSTEM RULES
    ============================ */
    if (mode === "add") {
        if (!staff.password?.trim()) return "Password is required";
    }

    if (!staff.property_id && !(isSuperAdmin || staffIsOwner))
        return "Please select a property";

    if (!staff.role_ids || staff.role_ids.length === 0)
        return "Please select a role";

    return null;
}
