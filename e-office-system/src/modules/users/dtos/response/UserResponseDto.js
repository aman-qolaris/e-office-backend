class UserResponseDto {
  constructor(user) {
    this.id = user.id;
    this.fullName = user.full_name;
    this.phoneNumber = user.phone_number;
    this.email = user.email;
    this.systemRole = user.system_role;
    this.designation = user.designation;
    this.isActive = user.is_active;

    // Return Department Name if available, otherwise just ID
    this.department = user.department
      ? user.department.name
      : user.department_id;

    // Timestamps
    this.createdAt = user.createdAt;
  }
}

export default UserResponseDto;
