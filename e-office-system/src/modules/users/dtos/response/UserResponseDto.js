class UserResponseDto {
  constructor(user) {
    this.id = user.id;
    this.fullName = user.full_name;
    this.phoneNumber = user.phone_number;
    this.email = user.email;
    this.systemRole = user.system_role;
    this.designation = user.designation ? user.designation.name : "N/A";
    this.isActive = user.is_active;

    // Return Department Name if available, otherwise just ID
    this.department = user.department
      ? user.department.name
      : user.department_id;

    // Timestamps
    const options = {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    this.createdAt = user.createdAt
      ? new Date(user.createdAt).toLocaleString("en-IN", options)
      : null;
  }
}

export default UserResponseDto;
