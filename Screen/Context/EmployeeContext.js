import React, { createContext, useContext, useState } from "react";

const EmployeeContext = createContext(null);

export const EmployeeProvider = ({ children }) => {
  const [empCode, setEmpCode] = useState(null);

  return (
    <EmployeeContext.Provider
      value={{
        empCode,
        setEmpCode,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error("useEmployee must be used within EmployeeProvider");
  }
  return context;
};
