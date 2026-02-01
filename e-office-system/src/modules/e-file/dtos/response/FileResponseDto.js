class FileResponseDto {
  constructor(file) {
    this.id = file.id;
    this.fileNumber = file.file_number;
    this.subject = file.subject;
    this.priority = file.priority;
    this.type = file.type;
    this.status = file.status;

    // File Details
    this.pucUrl = file.puc_url;
    this.originalName = file.original_filename;

    // Departments & Users (if included)
    this.department = file.department
      ? file.department.name
      : file.department_id;
    this.createdBy = file.creator ? file.creator.full_name : file.created_by;

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

    this.createdAt = new Date(file.createdAt).toLocaleString("en-IN", options);
    this.updatedAt = new Date(file.updatedAt).toLocaleString("en-IN", options);
  }
}

export default FileResponseDto;
