export const staffByEmailsQuery = /* groq */ `
  *[_type == "staff" && lower(email) in $emails]{
    _id,
    "email": lower(email),
    role,
    "departmentId": coalesce(
      department._ref,
      division->department._ref,
      section->division->department._ref
    ),
    "departmentName": coalesce(
      department->fullName,
      division->department->fullName,
      section->division->department->fullName
    )
  }
`

export const departmentsForAdminQuery = /* groq */ `
  *[_type == "department"] | order(coalesce(fullName, name) asc) {
    _id,
    "label": coalesce(fullName, name)
  }
`
