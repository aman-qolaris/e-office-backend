class AuthResponseDto {
  constructor(user, token) {
    this.token = token;
    this.user = {
      id: user.id,
      fullName: user.full_name,
      phoneNumber: user.phone_number,
      systemRole: user.system_role, // ADMIN, STAFF, BOARD_MEMBER
      designation: user.designation, // SYSTEM_ADMIN, PRESIDENT, etc.
      department: user.department ? user.department.name : null,
      isPinSet: !!user.security_pin,
    };
  }
}

export default AuthResponseDto;
