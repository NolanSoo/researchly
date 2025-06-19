const chatMessagesDiv = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const scholarlyResultsDiv = document.getElementById('scholarly-results');


const OBFUSCATED_DEEPSEEK_API_KEY = 'YTI5Y2ZlNGZhNm1zaGI2M2RhOTg0ZTRiM2Y3ZHAxMmVmZGFqc25lZGEzODRlZDhiODM='; // Your Base64 encoded API key
const DEEPSEEK_API_URL = 'https://deepseek-v31.p.rapidapi.com/';
const DEEPSEEK_MODEL = 'DeepSeek-V3-0324'; 

let currentStep = 0;
const userData = {
    interests: '',
    competition: '',
    ideaScope: '',
    resources: '',
    selectedPaperAbstract: '',
    selectedNiche: '',
    finalIdea: ''
};


function getApiKey() {
    try {
        return atob(OBFUSCATED_DEEPSEEK_API_KEY);
    } catch (e) {
        console.error("Error decoding API key. Ensure it's a valid Base64 string.", e);
       
        return "INVALID_KEY_FALLBACK";
    }
}


function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'bot' ? 'bot-message' : 'user-message');
    messageDiv.textContent = text;
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Scroll to bottom
}

function displayLoadingMessage(text = "Thinking...") {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'bot-message', 'loading-message');
    loadingDiv.textContent = text;
    chatMessagesDiv.appendChild(loadingDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    return loadingDiv;
}

function removeLoadingMessage(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
    }
}

async function callDeepSeekAPI(promptContent, systemMessage = "You are a helpful research assistant.") {
    const loading = displayLoadingMessage();
    const actualApiKey = getApiKey(); // Decode the key here

    if (actualApiKey === "INVALID_KEY_FALLBACK") {
        removeLoadingMessage(loading);
        displayMessage('Critical error: API key could not be decoded.', 'bot');
        return null;
    }

    const data = JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: promptContent }
        ],
        max_tokens: 500,
        temperature: 0.7
    });

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'x-rapidapi-key': actualApiKey, // Use the decoded key
                'x-rapidapi-host': 'deepseek-v31.p.rapidapi.com',
                'Content-Type': 'application/json'
            },
            body: data
        });
        removeLoadingMessage(loading);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API Error:', response.status, errorText);
            displayMessage(`Error communicating with AI: ${response.status}. Check console for details.`, 'bot');
            return null;
        }

        const result = await response.json();
        if (result.choices && result.choices.length > 0 && result.choices[0].message) {
            return result.choices[0].message.content.trim();
        } else {
            console.error('DeepSeek API unexpected response format:', result);
            displayMessage('AI gave an unexpected response. Check console.', 'bot');
            return null;
        }
    } catch (error) {
        removeLoadingMessage(loading);
        console.error('Error calling DeepSeek API:', error);
        displayMessage('Failed to connect to AI. Check your internet connection or API key.', 'bot');
        return null;
    }
}

// ... (the rest of your script.js code remains the same)
// Ensure handleUserInput, searchScholarlyAndProcess, handlePaperClick, 
// handleNicheClick, handleIdeaClick, checkIdeaUniquenessAndSuccess, 
// startChat, and event listeners are still present below this.

async function handleUserInput() {
    const text = userInput.value.trim();
    if (text === '') return;

    displayMessage(text, 'user');
    userInput.value = ''; // Clear input

    currentStep++;

    if (currentStep === 1) { // General Interests
        userData.interests = text;
        displayMessage('Interesting! Which competition are you working on (e.g., ISEF, local science fair, personal project)?', 'bot');
    } else if (currentStep === 2) { // Competition
        userData.competition = text;
        displayMessage('Got it. Are you looking for a short-term project idea or a more ambitious, "change the world" type of marquee idea?', 'bot');
    } else if (currentStep === 3) { // Idea Scope
        userData.ideaScope = text;
        displayMessage('Good to know. What kind of resources (lab access, specific equipment, software) and budget (approximate) are you working with?', 'bot');
    } else if (currentStep === 4) { // Resources & Budget
        userData.resources = text;
        displayMessage('Thanks for the details. Now, I\'ll use AI to generate a search query for Google Scholar based on your interests.', 'bot');

        const scholarlyQueryPrompt = `Based on the user's interest in "${userData.interests}", generate a concise and effective search query for Google Scholar to find research papers. The query should focus on innovative or niche aspects of the interest. Output only the search query itself, nothing else.`;
        const scholarlyQuery = await callDeepSeekAPI(scholarlyQueryPrompt);

        if (scholarlyQuery) {
            displayMessage(`AI suggested search query: "${scholarlyQuery}". Searching scholarly articles...`, 'bot');
            searchScholarlyAndProcess(scholarlyQuery);
        } else {
            displayMessage('Could not generate a search query. Please try rephrasing your interests or try again later.', 'bot');
            currentStep--; // Allow retry for this step
        }
    } else if (currentStep === 5) { // User selected a paper/niche or wants to input own idea
        userData.finalIdea = text;
        displayMessage(`Okay, you're considering the idea: "${userData.finalIdea}". I'll check its potential uniqueness and success.`, 'bot');
        checkIdeaUniquenessAndSuccess(userData.finalIdea);
    }
}

async function searchScholarlyAndProcess(query) {
    scholarlyResultsDiv.innerHTML = '<p class="loading-message">Fetching scholarly articles...</p>';
    try {
        const results = await scholarly.search(query);
        scholarlyResultsDiv.innerHTML = '';

        if (!results || results.length === 0) {
            displayMessage('No relevant papers found with that query. Try a different interest or query.', 'bot');
            scholarlyResultsDiv.innerHTML = '<p>No papers found.</p>';
            currentStep = 3;
            displayMessage('Let\'s try again. What are your general interests or fields you\'re passionate about?', 'bot');
            return;
        }

        const numToPick = Math.min(3, Math.floor(results.length * 0.4));
        const startIndex = Math.max(0, results.length - numToPick - 1);

        const selectedPapers = [];
        if (results.length > 0) {
            for (let i = 0; i < numToPick; i++) {
                if (results.length > startIndex + i) {
                    selectedPapers.push(results[startIndex + i]);
                }
            }
        }

        if (selectedPapers.length === 0 && results.length > 0) {
            selectedPapers.push(results[results.length - 1]);
        }

        if (selectedPapers.length === 0) {
            displayMessage('Could not select specific papers for niche analysis. You can try another search.', 'bot');
            currentStep = 3;
            return;
        }

        displayMessage('Here are a few papers from less explored areas. Click one to explore related niches, or type your own idea if you have one.', 'bot');

        let paperAbstractsForNichePrompt = "Analyze the following research paper titles and abstracts:\n";
        selectedPapers.forEach((paper, index) => {
            const paperDiv = document.createElement('div');
            paperDiv.classList.add('paper');
            paperDiv.innerHTML = `<strong>${paper.title}</strong><p>${paper.description || 'No abstract available.'}</p>`;
            paperDiv.dataset.abstract = paper.description || paper.title;
            paperDiv.dataset.title = paper.title;
            paperDiv.onclick = () => handlePaperClick(paper.title, paper.description || paper.title);
            scholarlyResultsDiv.appendChild(paperDiv);
            paperAbstractsForNichePrompt += `Paper ${index + 1} Title: ${paper.title}\nAbstract: ${paper.description || 'N/A'}\n\n`;
        });

        const nichePrompt = `${paperAbstractsForNichePrompt}Identify 2-3 potential research niches or underserved areas suggested by these papers that would be suitable for a student project for the "${userData.competition}" competition. For each niche, provide a short title and a brief explanation (1-2 sentences). Format as: NICHE TITLE: [Title]\nEXPLANATION: [Explanation]`;
        const nicheSuggestions = await callDeepSeekAPI(nichePrompt);

        if (nicheSuggestions) {
            displayMessage("Based on these papers, here are some potential niches:", 'bot');
            const niches = nicheSuggestions.split(/NICHE TITLE:/g).slice(1);
            scholarlyResultsDiv.innerHTML += '<h3>Potential Niches:</h3>';
            if (niches.length > 0) {
                niches.forEach(nicheText => {
                    const titleMatch = nicheText.match(/^(.*?)\nEXPLANATION:/s);
                    const explanationMatch = nicheText.match(/EXPLANATION:(.*)/s);
                    if (titleMatch && explanationMatch) {
                        const title = titleMatch[1].trim();
                        const explanation = explanationMatch[1].trim();
                        const nicheDiv = document.createElement('div');
                        nicheDiv.classList.add('niche');
                        nicheDiv.innerHTML = `<strong>${title}</strong><p>${explanation}</p>`;
                        nicheDiv.dataset.nicheTitle = title;
                        nicheDiv.onclick = () => handleNicheClick(title);
                        scholarlyResultsDiv.appendChild(nicheDiv);
                    }
                });
            } else {
                scholarlyResultsDiv.innerHTML += '<p>AI could not extract specific niches in the expected format. You can still type your own idea.</p>';
            }
        } else {
            displayMessage('Could not get niche suggestions from AI. You can type your own research idea.', 'bot');
        }

    } catch (error) {
        console.error('Error in searchScholarlyAndProcess:', error);
        displayMessage('Error fetching or processing scholarly articles. See console.', 'bot');
        scholarlyResultsDiv.innerHTML = '<p>Error loading articles.</p>';
        currentStep = 3;
    }
}

function handlePaperClick(title, abstract) {
    displayMessage(`You selected paper: "${title}". Let's see what niches AI suggests or you can type your own idea.`, 'user');
    userData.selectedPaperAbstract = abstract;
    currentStep = 4;
    displayMessage('AI has suggested some niches above based on a selection of papers. Click a niche to get ideas, or type your own research idea now.', 'bot');
}

async function handleNicheClick(nicheTitle) {
    displayMessage(`You selected niche: "${nicheTitle}". Generating ideas...`, 'user');
    userData.selectedNiche = nicheTitle;
    scholarlyResultsDiv.innerHTML = '<p class="loading-message">Generating ideas for this niche...</p>';

    const ideaPrompt = `Generate 2-3 innovative research project ideas for a student working on the "${userData.competition}" competition. The idea should be related to the niche: "${userData.selectedNiche}". The student prefers a "${userData.ideaScope}" idea and has "${userData.resources}" resources/budget. For each idea, provide a short title and a brief concept (1-2 sentences). Format as: IDEA TITLE: [Title]\nCONCEPT: [Concept]`;
    const ideaSuggestions = await callDeepSeekAPI(ideaPrompt);

    scholarlyResultsDiv.innerHTML = `<h3>Ideas for Niche: ${nicheTitle}</h3>`;
    if (ideaSuggestions) {
        const ideas = ideaSuggestions.split(/IDEA TITLE:/g).slice(1);
        if (ideas.length > 0) {
            ideas.forEach(ideaText => {
                const titleMatch = ideaText.match(/^(.*?)\nCONCEPT:/s);
                const conceptMatch = ideaText.match(/CONCEPT:(.*)/s);
                if (titleMatch && conceptMatch) {
                    const title = titleMatch[1].trim();
                    const concept = conceptMatch[1].trim();
                    const ideaDiv = document.createElement('div');
                    ideaDiv.classList.add('idea');
                    ideaDiv.innerHTML = `<strong>${title}</strong><p>${concept}</p>`;
                    ideaDiv.dataset.ideaTitle = title;
                    ideaDiv.onclick = () => handleIdeaClick(title);
                    scholarlyResultsDiv.appendChild(ideaDiv);
                }
            });
            displayMessage('Click on an idea you like, or type your own refined version.', 'bot');
        } else {
            scholarlyResultsDiv.innerHTML += '<p>AI could not extract specific ideas in the expected format. You can type your own idea.</p>';
            displayMessage('AI could not generate specific ideas in the expected format. Feel free to type your own research idea.', 'bot');
        }
    } else {
        displayMessage('Could not get idea suggestions from AI. Please type your own research idea.', 'bot');
    }
    currentStep = 4;
}

function handleIdeaClick(ideaTitle) {
    displayMessage(`You've chosen the idea: "${ideaTitle}". Let's check its potential.`, 'user');
    userData.finalIdea = ideaTitle;
    checkIdeaUniquenessAndSuccess(ideaTitle);
    currentStep = 5;
}

async function checkIdeaUniquenessAndSuccess(ideaDescription) {
    scholarlyResultsDiv.innerHTML = `<p class="loading-message">Assessing idea: ${ideaDescription}...</p>`;
    const assessmentPrompt = `A student is proposing the following research idea for the "${userData.competition}" competition: "${ideaDescription}".
Their general interests are: "${userData.interests}".
Their idea scope preference is: "${userData.ideaScope}".
Their available resources/budget are: "${userData.resources}".

1. Briefly assess the potential uniqueness of this idea (is it novel, or a new take on existing work?).
2. Predict its potential for success in the competition, providing 1-2 pieces of supporting evidence or reasoning.
Keep the response concise and actionable.`;

    const assessment = await callDeepSeekAPI(assessmentPrompt);
    scholarlyResultsDiv.innerHTML = '';
    if (assessment) {
        displayMessage(`Assessment for your idea "${ideaDescription}":\n${assessment}`, 'bot');
        displayMessage('This concludes our session! Good luck with your research!', 'bot');
    } else {
        displayMessage(`Could not get an assessment for your idea.`, 'bot');
    }
    currentStep = 6;
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.placeholder = "Session ended. Refresh to start over.";
}

function startChat() {
    displayMessage('Hi! I\'m Researchly, here to help you find innovative research ideas. First, what are your general interests or fields you\'re passionate about?', 'bot');
}

sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});

startChat();