import { vi } from "vitest";
import React from "react";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    fill,
    priority,
    sizes,
    loading,
    decoding,
    ...props
  }: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    loading?: string;
    decoding?: string;
    [key: string]: unknown;
  }) =>
    React.createElement("img", {
      src,
      alt: alt ?? "",
      width: fill || width === undefined ? undefined : width,
      height: fill || height === undefined ? undefined : height,
      loading: priority ? "eager" : loading,
      decoding,
      ...props,
    }),
}));