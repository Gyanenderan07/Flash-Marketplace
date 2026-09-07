import React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { DynamicIslandToaster } from "./DynamicIslandToaster";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <>
      {/* Background state manager for Sonner toasts */}
      <div style={{ display: "none" }} aria-hidden="true">
        <Sonner position="top-center" {...props} />
      </div>

      {/* Top-Center Dynamic Island Toast Capsule */}
      <DynamicIslandToaster />
    </>
  );
};

export { Toaster };
