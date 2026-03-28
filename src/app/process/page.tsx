"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProcessPage() {
  const router = useRouter();
  
  // Redirect to all-activity page (old process flow is replaced by Manage and Filter modal)
  useEffect(() => {
    router.replace('/all-activity');
  }, [router]);
  
  return null;
}

