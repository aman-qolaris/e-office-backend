class FileResponseDto {
  constructor(file) {
    this.id = file.id;
    this.fileNumber = file.file_number;
    this.subject = file.subject;
    this.description = file.description;
    this.priority = file.priority;
    this.type = file.type;
    this.status = file.status;
    this.isVerified = file.is_verified;
    this.verifiedBy = file.verifier ? file.verifier.full_name : null;

    this.creatorId = file.created_by;

    if (file.latestMovement && file.latestMovement.sender) {
      this.lastSender = file.latestMovement.sender.full_name;
      this.sentByDesignation = file.latestMovement.sender.designation
        ? file.latestMovement.sender.designation.name
        : null;
    } else {
      this.lastSender = null;
      this.sentByDesignation = null;
    }

    this.lastAction = file.latestMovement
      ? file.latestMovement.action
      : "CREATED";
    this.lastRemark = file.latestMovement
      ? file.latestMovement.remarks
      : "File Initiated";

    // --- CONVERT TO INDIAN TIME (IST) ---
    const options = {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    // File Details
    this.verifiedAt = file.verified_at
      ? new Date(file.verified_at).toLocaleString("en-IN", options)
      : null;
    this.pucUrl = file.puc_url;
    this.originalName = file.original_filename;

    this.attachments = file.attachments
      ? file.attachments.map((att) => ({
          id: att.id,
          name: att.original_name,
          url: att.file_url,
          type: att.mime_type,
          size: att.file_size,
        }))
      : [];

    // Departments & Users (if included)
    this.department = file.department
      ? file.department.name
      : file.department_id;
    this.createdBy = file.creator ? file.creator.full_name : file.created_by;

    this.createdAt = new Date(file.createdAt).toLocaleString("en-IN", options);
    this.updatedAt = new Date(file.updatedAt).toLocaleString("en-IN", options);

    if (file.currentHolder) {
      this.currentHolder = file.currentHolder.full_name;
    } else {
      this.currentHolder = "Pending Assignment"; // Handle null user
    }

    // NEW: Show Current Position
    this.currentPosition = {
      designation: file.currentDesignation
        ? file.currentDesignation.name
        : "Unknown",
      department: file.currentDepartment
        ? file.currentDepartment.name
        : "Unknown",
    };
  }
}

export default FileResponseDto;
