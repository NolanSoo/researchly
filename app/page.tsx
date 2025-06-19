"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, User, Loader2, Lightbulb, AlertTriangle, RefreshCw } from "lucide-react"

interface Message {
  id: string
  text: string | React.ReactNode
  sender: "user" | "bot"
  type?: "text" | "options" | "assessment"
  options?: { label: string; value: string }[]
  assessmentData?: any
}

interface UserData {
  interests?: string
  competition?: string
  ideaScope?: string
  resources?: string
  chosenQuery?: string
  chosenIdea?: { title: string; concept: string; whyInnovative: string }
}

// WARNING: Storing API keys client-side, even "obfuscated", is insecure.
// Replace with your actual Base64 encoded RapidAPI key for DeepSeek.
// Example: if your key is 'YOUR_RAPIDAPI_KEY', encode it: btoa('YOUR_RAPIDAPI_KEY')
const OBFUSCATED_RAPIDAPI_KEY = "YTI5Y2ZlNGZhNm1zaGI2M2RhOTg0ZTRiM2Y3ZHAxMmVmZGFqc25lZGEzODRlZDhiODM=" // Default: btoa('a29cfe4fa6mshb63da984e4b3f7dp12efdajsneda384ed8b83')
const DEEPSEEK_RAPIDAPI_URL = "https://deepseek-v31.p.rapidapi.com/" // From your original example
const DEEPSEEK_RAPIDAPI_HOST = "deepseek-v31.p.rapidapi.com"
const DEEPSEEK_MODEL_NAME = "DeepSeek-V3-0324" // From your original example, or use 'deepseek-chat' if preferred

function getApiKey() {
  try {
    return atob(OBFUSCATED_RAPIDAPI_KEY)
  } catch (e) {
    console.error("Error decoding API key:", e)
    return "" // Return empty or handle error appropriately
  }
}

async function callDeepSeekClientSide(model: string, messagesForAPI: any[]) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("API key is missing or invalid after decoding.")
  }

  const body = JSON.stringify({
    model: model,
    messages: messagesForAPI,
    max_tokens: 1024,
    temperature: 0.7,
  })

  const response = await fetch(DEEPSEEK_RAPIDAPI_URL, {
    method: "POST",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": DEEPSEEK_RAPIDAPI_HOST,
      "Content-Type": "application/json",
    },
    body: body,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("DeepSeek API Error:", response.status, errorBody)
    throw new Error(`DeepSeek API request failed with status ${response.status}: ${errorBody}`)
  }
  // RapidAPI often wraps the actual provider's response.
  // The structure might be directly the provider's response or nested.
  // Assuming it's directly the provider's response structure for now.
  const result = await response.json()
  // Check common structures for chat completions
  if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
    return result.choices[0].message.content.trim()
  } else if (result.text) {
    // Some APIs might return text directly
    return result.text.trim()
  }
  // If the structure is different, this part needs adjustment based on actual API response from RapidAPI
  console.warn("DeepSeek API response structure not as expected:", result)
  throw new Error("Unexpected response structure from DeepSeek API via RapidAPI.")
}

export default function ResearchlyPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [userData, setUserData] = useState<UserData>({})
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const initialQuestions = [
    "Hi! I'm Researchly. To start, what are your general interests or fields you're passionate about?",
    "Which competition are you working on (e.g., ISEF, local science fair, personal project)?",
    "Are you looking for a short-term project idea or a more ambitious, 'change the world' type of marquee idea?",
    "What kind of resources (lab access, specific equipment, software) and budget (approximate) are you working with?",
    "Thanks! I'll now generate some Google Scholar search queries based on your interests.",
  ]

  useEffect(() => {
    if (messages.length === 0) {
      addBotMessage(initialQuestions[0])
    }
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages])

  const addMessage = (
    text: string | React.ReactNode,
    sender: "user" | "bot",
    type?: Message["type"],
    options?: Message["options"],
    assessmentData?: Message["assessmentData"],
  ) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), text, sender, type, options, assessmentData }])
  }

  const addUserMessage = (text: string) => {
    addMessage(text, "user")
  }

  const addBotMessage = (
    text: string | React.ReactNode,
    type?: Message["type"],
    options?: Message["options"],
    assessmentData?: Message["assessmentData"],
  ) => {
    addMessage(text, "bot", type, options, assessmentData)
  }

  const handleClientAPICall = async (promptType: string, currentData: UserData) => {
    setIsLoading(true)
    const systemMessage = "You are Researchly, an AI assistant helping students find innovative research project ideas."
    let userPromptContent = ""
    const messagesForAPI: any[] = [{ role: "system", content: systemMessage }]

    if (promptType === "generate_queries") {
      userPromptContent = `My general interests are: "${currentData.interests}".
I am working on the "${currentData.competition}" competition.
I prefer a "${currentData.ideaScope}" idea.
My resources/budget are: "${currentData.resources}".
Generate 3 diverse Google Scholar search query suggestions to help me find innovative research ideas. Focus on areas ripe for further research or underserved topics. Output each query on a new line, without any numbering or prefixes.`
    } else if (promptType === "generate_ideas") {
      userPromptContent = `Based on my profile (Interests: "${currentData.interests}", Competition: "${currentData.competition}", Scope: "${currentData.ideaScope}", Resources: "${currentData.resources}") and the chosen Google Scholar search direction: "${currentData.chosenQuery}".
Imagine you've analyzed research papers found with this query, particularly their 'further research' or 'future work' sections.
Generate 2-3 innovative project ideas suitable for me.
For each idea, provide:
IDEA TITLE: [Title]
CONCEPT: [Brief concept (2-3 sentences)]
WHY_INNOVATIVE: [Reasoning (1-2 sentences)]
Separate each idea clearly.`
    } else if (promptType === "assess_idea") {
      userPromptContent = `I'm considering the following research idea:
TITLE: ${currentData.chosenIdea?.title}
CONCEPT: ${currentData.chosenIdea?.concept}
WHY_INNOVATIVE: ${currentData.chosenIdea?.whyInnovative}

My student profile:
Interests: "${currentData.interests}"
Competition: "${currentData.competition}"
Idea Scope Preference: "${currentData.ideaScope}"
Available Resources/Budget: "${currentData.resources}"

Please provide an assessment:
1.  Rate its innovativeness on a scale of 1 to 100.
2.  Predict its potential for success in the "${currentData.competition}" competition. Provide brief reasoning (1-2 sentences).
3.  Provide 1-2 examples of 'evidence' or context that could support this idea's relevance or timeliness (e.g., 'Similar projects like X won at ISEF YYYY by exploring Z', or 'Current research trends in ABC highlight the need for solutions in this area').
4.  Include this exact disclaimer: 'AI predictions are speculative and not a guarantee of success. Thorough literature review and mentorship are crucial.'

Structure your response clearly, ideally so I can parse it. For example:
INNOVATIVENESS: [Number]
SUCCESS_PREDICTION: [Text]
EVIDENCE:
- [Evidence 1]
- [Evidence 2]
DISCLAIMER: [The exact disclaimer text]`
    }

    messagesForAPI.push({ role: "user", content: userPromptContent })

    try {
      const rawResponse = await callDeepSeekClientSide(DEEPSEEK_MODEL_NAME, messagesForAPI)

      if (promptType === "generate_queries") {
        const queries = rawResponse.trim().split("\n").filter(Boolean)
        return { queries }
      } else if (promptType === "generate_ideas") {
        const ideas = []
        const ideaBlocks = rawResponse.split(/IDEA TITLE:/g).slice(1)
        for (const block of ideaBlocks) {
          const titleMatch = block.match(/^(.*?)\nCONCEPT:/s)
          const conceptMatch = block.match(/CONCEPT:(.*?)\nWHY_INNOVATIVE:/s)
          const innovativeMatch = block.match(/WHY_INNOVATIVE:(.*)/s)
          if (titleMatch && conceptMatch && innovativeMatch) {
            ideas.push({
              title: titleMatch[1].trim(),
              concept: conceptMatch[1].trim(),
              whyInnovative: innovativeMatch[1].trim(),
            })
          }
        }
        return { ideas }
      } else if (promptType === "assess_idea") {
        const innovativenessMatch = rawResponse.match(/INNOVATIVENESS:\s*(\d+)/)
        const successPredictionMatch = rawResponse.match(
          /SUCCESS_PREDICTION:\s*([\s\S]*?)(?=\nEVIDENCE:|\nDISCLAIMER:|$)/,
        )
        const evidenceBlockMatch = rawResponse.match(/EVIDENCE:\s*([\s\S]*?)(?=\nDISCLAIMER:|$)/)
        const disclaimerMatch = rawResponse.match(/DISCLAIMER:\s*([\s\S]*?)$/)
        const evidence = evidenceBlockMatch
          ? evidenceBlockMatch[1]
              .trim()
              .split(/-\s*/)
              .map((e) => e.trim())
              .filter(Boolean)
          : []
        const assessment = {
          title: currentData.chosenIdea?.title,
          innovativeness: innovativenessMatch ? Number.parseInt(innovativenessMatch[1]) : "N/A",
          success_prediction: successPredictionMatch ? successPredictionMatch[1].trim() : "N/A",
          evidence: evidence,
          disclaimer: disclaimerMatch ? disclaimerMatch[1].trim() : "Disclaimer not found in AI response.",
        }
        return { assessment }
      }
      return null // Should not happen if promptType is valid
    } catch (error: any) {
      addBotMessage(
        <>
          <AlertTriangle className="h-4 w-4 inline-block mr-1" /> Error: {error.message}
        </>,
      )
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const processUserInput = async () => {
    if (userInput.trim() === "") return
    addUserMessage(userInput)
    const currentInput = userInput
    setUserInput("")

    const newUserData = { ...userData }
    let nextStep = currentStep + 1

    if (currentStep === 0) {
      newUserData.interests = currentInput
      addBotMessage(initialQuestions[1])
    } else if (currentStep === 1) {
      newUserData.competition = currentInput
      addBotMessage(initialQuestions[2])
    } else if (currentStep === 2) {
      newUserData.ideaScope = currentInput
      addBotMessage(initialQuestions[3])
    } else if (currentStep === 3) {
      newUserData.resources = currentInput
      addBotMessage(initialQuestions[4])
      const result = await handleClientAPICall("generate_queries", { ...newUserData, resources: currentInput })
      if (result && result.queries) {
        addBotMessage(
          "Here are some search queries. Click one to proceed:",
          "options",
          result.queries.map((q: string) => ({ label: q, value: q })),
        )
        nextStep = 4
      }
    }
    setUserData(newUserData)
    setCurrentStep(nextStep)
  }

  const handleOptionSelect = async (value: string) => {
    addUserMessage(`Selected: ${value}`)
    const newUserData = { ...userData }
    let nextStep = currentStep

    if (currentStep === 4) {
      newUserData.chosenQuery = value
      addBotMessage("Great! Generating project ideas based on this query, focusing on 'further research' areas...")
      const result = await handleClientAPICall("generate_ideas", newUserData)
      if (result && result.ideas) {
        addBotMessage(
          "Here are some project ideas. Click one to get an assessment:",
          "options",
          result.ideas.map((idea: any) => ({ label: `${idea.title} - ${idea.concept}`, value: JSON.stringify(idea) })),
        )
        nextStep = 5
      }
    } else if (currentStep === 5) {
      const chosenIdea = JSON.parse(value)
      newUserData.chosenIdea = chosenIdea
      addBotMessage("Excellent choice! Assessing this idea's potential...")
      const result = await handleClientAPICall("assess_idea", newUserData)
      if (result && result.assessment) {
        addBotMessage("Here's an assessment of your chosen idea:", "assessment", undefined, result.assessment)
        addBotMessage(
          <>
            Would you like to{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => handleRestartStage(4)}>
              get more ideas from a different search query
            </Button>{" "}
            or{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => handleRestartStage(5)}>
              get more ideas for the current query
            </Button>
            ? Or{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => handleRestartStage(0)}>
              start over
            </Button>
            ?
          </>,
        )
        nextStep = 6
      }
    }
    setUserData(newUserData)
    setCurrentStep(nextStep)
  }

  const handleRestartStage = (stage: number) => {
    if (stage === 0) {
      setMessages([])
      setUserData({})
      setCurrentStep(0)
      addBotMessage(initialQuestions[0])
    } else if (stage === 4) {
      const tempUserData = { ...userData, chosenQuery: undefined, chosenIdea: undefined }
      setUserData(tempUserData)
      setCurrentStep(0)
      addBotMessage(initialQuestions[0]) // Restart to interests for new queries
    } else if (stage === 5) {
      if (userData.chosenQuery) {
        addBotMessage(`Okay, generating more ideas for the query: "${userData.chosenQuery}"...`)
        const tempUserData = { ...userData, chosenIdea: undefined }
        setUserData(tempUserData)
        setCurrentStep(4) // Set step to query selected
        // Simulate re-selecting the query to trigger idea generation
        // This is a bit of a hack; ideally, a dedicated function would handle this.
        // For now, we'll directly call the API handler.
        handleClientAPICall("generate_ideas", { ...tempUserData, chosenQuery: userData.chosenQuery }).then((result) => {
          if (result && result.ideas) {
            addBotMessage(
              "Here are some project ideas. Click one to get an assessment:",
              "options",
              result.ideas.map((idea: any) => ({
                label: `${idea.title} - ${idea.concept}`,
                value: JSON.stringify(idea),
              })),
            )
            setCurrentStep(5) // Move to idea selection step
          }
        })
      } else {
        addBotMessage("Please select a search query first.")
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center">
            <Lightbulb className="h-8 w-8 mr-2 text-primary" /> Researchly AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full pr-4" ref={scrollAreaRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${msg.sender === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  <div className="flex items-start mb-1">
                    {msg.sender === "bot" && <Bot className="h-5 w-5 mr-2 flex-shrink-0" />}
                    {msg.sender === "user" && <User className="h-5 w-5 mr-2 flex-shrink-0" />}
                    <span className="font-semibold text-sm">{msg.sender === "user" ? "You" : "Researchly AI"}</span>
                  </div>
                  {typeof msg.text === "string" ? <p className="text-sm">{msg.text}</p> : msg.text}
                  {msg.type === "options" && msg.options && (
                    <div className="mt-2 space-y-2">
                      {msg.options.map((opt) => (
                        <Button
                          key={opt.value}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto whitespace-normal bg-card hover:bg-accent"
                          onClick={() => handleOptionSelect(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  {msg.type === "assessment" && msg.assessmentData && (
                    <div className="mt-2 space-y-3">
                      <h4 className="font-semibold">
                        Idea Assessment: {msg.assessmentData.title || userData.chosenIdea?.title}
                      </h4>
                      <p className="text-sm">
                        <strong>Innovativeness:</strong> {msg.assessmentData.innovativeness}/100
                      </p>
                      <p className="text-sm">
                        <strong>Competition Success Potential:</strong> {msg.assessmentData.success_prediction}
                      </p>
                      <div>
                        <p className="text-sm font-medium">Evidence/Context:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 pl-1">
                          {msg.assessmentData.evidence?.map((ev: string, i: number) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                      <Alert variant="default" className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-semibold">Disclaimer</AlertTitle>
                        <AlertDescription className="text-xs">{msg.assessmentData.disclaimer}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="p-3 rounded-lg bg-secondary max-w-[80%]">
                  <div className="flex items-center">
                    <Bot className="h-5 w-5 mr-2 flex-shrink-0" />
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2 text-sm italic">Researchly AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isLoading && processUserInput()}
              disabled={isLoading || (currentStep >= 6 && messages.some((m) => m.type === "assessment"))}
            />
            <Button
              onClick={processUserInput}
              disabled={isLoading || (currentStep >= 6 && messages.some((m) => m.type === "assessment"))}
            >
              Send
            </Button>
            {currentStep >= 6 && messages.some((m) => m.type === "assessment") && (
              <Button onClick={() => handleRestartStage(0)} variant="outline" title="Start Over">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      {/* Removed the environment variable reminder as requested */}
    </div>
  )
}
