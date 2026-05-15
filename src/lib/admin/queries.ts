export const staffByEmailsQuery = /* groq */ `
  *[_type == "staff" && lower(email) in $emails]{
    _id,
    "email": lower(email),
    "departmentName": coalesce(
      department->fullName,
      division->department->fullName,
      section->division->department->fullName
    )
  }
`
