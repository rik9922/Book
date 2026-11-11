"use client";

import React from "react";
import { AuthFlowPanel } from "@/components/AuthFlowPanel";

export default function LoginPage() {
  return <AuthFlowPanel initialMode="login" />;
}
