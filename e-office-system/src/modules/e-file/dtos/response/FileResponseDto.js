class FileResponseDto {
  constructor(file) {
    this.id = file.id;
    this.fileNumber = file.file_number;
    this.subject = file.subject;
    this.priority = file.priority;
    this.status = file.status;
    this.isVerified = file.is_verified;
    this.verifiedBy = file.verifier ? file.verifier.full_name : null;

    this.creatorId = file.created_by;

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

    this.createdAt = new Date(file.createdAt).toLocaleString("en-IN", options);
    this.updatedAt = new Date(file.updatedAt).toLocaleString("en-IN", options);

    // Departments & Users (if included)
    this.department = file.department
      ? file.department.name
      : file.department_id;
    this.createdBy = file.creator ? file.creator.full_name : file.created_by;

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

    if (
      file.movements &&
      Array.isArray(file.movements) &&
      file.movements.length > 0
    ) {
      // Sort chronologically (oldest to newest) so it reads like a chat
      const sortedMovements = file.movements.sort((a, b) => a.id - b.id);

      this.thread = sortedMovements.map((move) => ({
        id: move.id,
        action: move.action,
        remarks: move.remarks,
        sender: move.sender ? move.sender.full_name : "System",
        senderDesignation: move.sender?.designation?.name || null,
        date: new Date(move.createdAt).toLocaleString("en-IN", options),

        // 🚨 Attachments are now tied specifically to THIS reply
        attachments: move.attachments
          ? move.attachments.map((att) => ({
              id: att.id,
              name: att.original_name,
              url: att.file_url,
              type: att.mime_type,
              size: att.file_size,
            }))
          : [],
      }));

      // Dynamically set the latest info for Inbox List views
      const latest = this.thread[this.thread.length - 1];
      this.lastSender = latest.sender;
      this.sentByDesignation = latest.senderDesignation;
      this.lastAction = latest.action;
      this.lastRemark = latest.remarks;
    } else if (file.latestMovement) {
      // Fallback just in case a query only brings back `latestMovement`
      this.lastSender = file.latestMovement.sender
        ? file.latestMovement.sender.full_name
        : null;
      this.sentByDesignation =
        file.latestMovement.sender?.designation?.name || null;
      this.lastAction = file.latestMovement.action || "CREATED";
      this.lastRemark = file.latestMovement.remarks || "File Initiated";
      this.thread = [];
    } else {
      // Default empty states
      this.lastSender = null;
      this.sentByDesignation = null;
      this.lastAction = "CREATED";
      this.lastRemark = "File Initiated";
      this.thread = [];
    }
  }
}

export default FileResponseDto;
