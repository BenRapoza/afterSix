import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eef8ff" }}><SignUp /></main>;
}
