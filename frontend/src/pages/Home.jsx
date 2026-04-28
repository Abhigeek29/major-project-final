import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"
function Home() {
  const {userData,serverUrl,setUserData,getGeminiResponse}=useContext(userDataContext)
  const navigate=useNavigate()
  const [listening,setListening]=useState(false)
  const [userText,setUserText]=useState("")
  const [aiText,setAiText]=useState("")
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [mode, setMode] = useState("voice"); // 🔥 ADD THIS
  console.log("MODE:", mode);
  const isSpeakingRef=useRef(false)
  const recognitionRef=useRef(null)
  const [ham,setHam]=useState(false)
  const isRecognizingRef=useRef(false)
  const synth=window.speechSynthesis

  const handleLogOut=async ()=>{
    try {
      const result=await axios.get(`${serverUrl}/api/auth/logout`,{withCredentials:true})
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const startRecognition = () => {
    
   if (!isSpeakingRef.current && !isRecognizingRef.current) {
    try {
      recognitionRef.current?.start();
      console.log("Recognition requested to start");
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Start error:", error);
      }
    }
  }
    
  }

  const speak=(text)=>{
    const utterence=new SpeechSynthesisUtterance(text)
    utterence.lang = 'hi-IN';
    const voices =window.speechSynthesis.getVoices()
    const hindiVoice = voices.find(v => v.lang === 'hi-IN');
    if (hindiVoice) {
      utterence.voice = hindiVoice;
    }


    isSpeakingRef.current=true
    utterence.onend=()=>{
        setAiText("");
  isSpeakingRef.current = false;
  setTimeout(() => {
    startRecognition(); // ⏳ Delay se race condition avoid hoti hai
  }, 800);
    }
   synth.cancel(); // 🛑 pehle se koi speech ho to band karo
synth.speak(utterence);
  }

const handleCommand = (data, originalInput = "") => {
  const { type, userInput, response } = data;

  console.log("EXECUTING TYPE:", type);

  const combined = (
  (userInput || "") + " " + (originalInput || "")
).toLowerCase();

  // 🔥 GOOGLE
  if (type === 'google-search' || combined.includes("google") || combined.includes("search")) {
    const query = encodeURIComponent(userInput || chatInput);
    window.location.href = `https://www.google.com/search?q=${query}`;
    return;
  }

  // 🔥 YOUTUBE
  if (type === 'youtube-search' || type === 'youtube-play' || combined.includes("youtube")) {
    const query = encodeURIComponent(userInput || chatInput);
    window.location.href = `https://www.youtube.com/results?search_query=${query}`;
    return;
  }

  // 🔥 FACEBOOK (THIS WILL FIX YOUR ISSUE)
  if (type === "facebook-open" || combined.includes("facebook")) {
    window.open(`https://www.facebook.com/`, '_blank');
    return;
  }

  // 🔥 INSTAGRAM
  if (type === "instagram-open" || combined.includes("instagram")) {
    window.open(`https://www.instagram.com/`, '_blank');
    return;
  }

  // 🔥 LINKEDIN
if (type === "linkedin-open" || combined.includes("linkedin")) {
  window.open(`https://www.linkedin.com/`, '_blank');
  return;
}

  // 🔥 CALCULATOR
  if (type === 'calculator-open' || combined.includes("calculator")) {
    window.open(`https://www.google.com/search?q=calculator`, '_blank');
    return;
  }

  // 🔥 WEATHER
  if (type === "weather-show" || combined.includes("weather")) {
    window.open(`https://www.google.com/search?q=weather`, '_blank');
    return;
  }
};
  const sendMessage = async () => {
  if (!chatInput.trim()) return;

  // show user message
  const userMsg = { sender: "user", text: chatInput };
  setChatHistory((prev) => [...prev, userMsg]);

  try {
    console.log("Sending:", chatInput);

    const data = await getGeminiResponse(chatInput);
    console.log("AI RESPONSE:", data);
    console.log("Response:", data);
    console.log("AI RESPONSE:", data);

    // show bot response
    const botMsg = { sender: "bot", text: data.response };
    setChatHistory((prev) => [...prev, botMsg]);

    // reuse your existing logic (VERY IMPORTANT)
    handleCommand(data, chatInput);

    setChatInput("");
  } catch (error) {
    console.error("Chat error:", error);
  }
};

useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognitionRef.current = recognition;

  let isMounted = true;  // flag to avoid setState on unmounted component

  // Start recognition after 1 second delay only if component still mounted
  const startTimeout = setTimeout(() => {
  // 🔥 ONLY START IN VOICE MODE
  if (
    isMounted &&
    mode === "voice" &&
    !isSpeakingRef.current &&
    !isRecognizingRef.current
  ) {
    try {
      recognition.start();
      console.log("Recognition requested to start");
    } catch (e) {
      if (e.name !== "InvalidStateError") {
        console.error(e);
      }
    }
  }
}, 1000);

  recognition.onstart = () => {
    isRecognizingRef.current = true;
    setListening(true);
  };

  recognition.onend = () => {
  isRecognizingRef.current = false;
  setListening(false);

  // 🔥 STOP MIC IN CHAT MODE
  if (mode === "chat") return;

  if (isMounted && !isSpeakingRef.current) {
    setTimeout(() => {
      if (isMounted && mode === "voice") {
        try {
          recognition.start();
          console.log("Recognition restarted");
        } catch (e) {
          if (e.name !== "InvalidStateError") console.error(e);
        }
      }
    }, 1000);
  }
};

  recognition.onerror = (event) => {
    console.warn("Recognition error:", event.error);
    isRecognizingRef.current = false;
    setListening(false);
    if (event.error !== "aborted" && isMounted && !isSpeakingRef.current && mode === "voice") {
      setTimeout(() => {
        if (isMounted) {
          try {
            recognition.start();
            console.log("Recognition restarted after error");
          } catch (e) {
            if (e.name !== "InvalidStateError") console.error(e);
          }
        }
      }, 1000);
    }
  };

  recognition.onresult = async (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    if (transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
      setAiText("");
      setUserText(transcript);
      recognition.stop();
      isRecognizingRef.current = false;
      setListening(false);
      const data = await getGeminiResponse(transcript);
      handleCommand(data);
      setAiText(data.response);
      setUserText("");
    }
  };


    const greeting = new SpeechSynthesisUtterance(`Hello ${userData.name}, what can I help you with?`);
    greeting.lang = 'hi-IN';
   
    window.speechSynthesis.speak(greeting);
 

  return () => {
    isMounted = false;
    clearTimeout(startTimeout);
    recognition.stop();
    setListening(false);
    isRecognizingRef.current = false;
  };
}, [mode]);




  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      {/* 🔥 ONLY ADDITION */}
      <div className="w-full flex justify-center gap-4 mb-4">
        <button
          onClick={() => setMode("voice")}
          className={`px-4 py-2 rounded-full ${mode === "voice" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          🎤 Voice
        </button>

        <button
          onClick={() => setMode("chat")}
          className={`px-4 py-2 rounded-full ${mode === "chat" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          💬 Chat
        </button>
      </div>
      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(true)}/>
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham?"translate-x-0":"translate-x-full"} transition-transform`}>
 <RxCross1 className=' text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(false)}/>
 <button className='min-w-[150px] h-[60px]  text-black font-semibold   bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px]  text-black font-semibold  bg-white  rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>

<div className='w-full h-[2px] bg-gray-400'></div>
<h1 className='text-white font-semibold text-[19px]'>History</h1>

<div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
  {userData.history?.map((his)=>(
    <div className='text-gray-200 text-[18px] w-full h-[30px]  '>{his}</div>
  ))}

</div>

      </div>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]  bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold  bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
<img src={userData?.assistantImage} alt="" className='h-full object-cover'/>
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      {!aiText && <img src={userImg} alt="" className='w-[200px]'/>}
      {aiText && <img src={aiImg} alt="" className='w-[200px]'/>}
    
    <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText?userText:aiText?aiText:null}</h1>
    {/* 🔥 CHAT UI START */}
{mode === "chat" && (
  <div className="w-full max-w-[500px] mt-[20px] bg-[#ffffff10] p-[10px] rounded-lg">

    {/* Chat History */}
    <div className="h-[150px] overflow-y-auto flex flex-col gap-[5px] mb-[10px]">
      {chatHistory.map((msg, index) => (
        <div key={index} className="text-white text-[14px]">
          <strong>{msg.sender === "user" ? "You" : "AI"}:</strong> {msg.text}
        </div>
      ))}
    </div>

    {/* Input + Button */}
    <div className="flex gap-[10px]">
      <input
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        placeholder="Type message..."
        className="flex-1 p-[8px] rounded bg-black text-white outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") sendMessage();
        }}
      />

      <button
        onClick={sendMessage}
        className="bg-white text-black px-[10px] rounded"
      >
        Send
      </button>
    </div>

  </div>
)}
{/* 🔥 CHAT UI END */}
    </div>
  )
}

export default Home