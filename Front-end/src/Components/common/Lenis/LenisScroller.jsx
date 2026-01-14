import React from "react";
import useLenis from "../../../hooks/useLenis";

const ScrollWrapper = ({ children }) => {
  useLenis(); // activate Lenis for smooth scrolling

  return <div>{children}</div>;
};

export default ScrollWrapper;
