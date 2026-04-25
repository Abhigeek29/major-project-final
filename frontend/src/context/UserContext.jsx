import axios from 'axios'
import React, { createContext, useEffect, useState } from 'react'
export const userDataContext=createContext()
function UserContext({children}) {
    const serverUrl="http://localhost:8000"
    const [userData,setUserData]=useState(null)
    const [frontendImage,setFrontendImage]=useState(null)
     const [backendImage,setBackendImage]=useState(null)
     const [selectedImage,setSelectedImage]=useState(null)
    const handleCurrentUser=async ()=>{
        try {
            const result=await axios.get(`${serverUrl}/api/user/current`,{withCredentials:true})
            setUserData(result.data)
            console.log(result.data)
        } catch (error) {
            console.log(error)
        }
    }

   const getGeminiResponse = async (command) => {
  try {
    const result = await axios.post(
      `${serverUrl}/api/user/asktoassistant`,
      { command },
      { withCredentials: true }
    );

    console.log("Backend result:", result.data); // debug

    return result.data; // ✅ correct
  } catch (error) {
    console.log("API ERROR:", error);

    // ✅ VERY IMPORTANT fallback
    return {
      type: "general",
      userInput: command,
      response: "Sorry, something went wrong.",
    };
  }
};

    useEffect(()=>{
handleCurrentUser()
    },[])
    const value={
serverUrl,userData,setUserData,backendImage,setBackendImage,frontendImage,setFrontendImage,selectedImage,setSelectedImage,getGeminiResponse
    }
  return (
    <div>
    <userDataContext.Provider value={value}>
      {children}
      </userDataContext.Provider>
    </div>
  )
}

export default UserContext
