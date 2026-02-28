from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI

import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

# 1. Groq API 연결
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key = os.getenv("GROQ_API_KEY")
)

class UserRequest(BaseModel):
    user_message: str

chat_history = []

# 2. 🌟 매뉴얼 파일 읽어오기
try:
    with open("manual.txt", "r", encoding="utf-8") as file:
        manual_content = file.read()
except FileNotFoundError:
    manual_content = "No manual found. Give general safe advice."

@app.post("/chat")
async def voicebot_chat(request: UserRequest):
    user_msg = request.user_message
    
    # 3. 🌟 시스템 프롬프트에 매뉴얼 내용 합치기
    system_prompt = f"""
    You are 'SilverGuard', a professional legal counseling voicebot helping victims of voice phishing.
    The user is currently panicked. You must guide them calmly and clearly.
    All your responses must be entirely in English.
    
    [IMPORTANT INSTRUCTIONS]
    Base your advice STRICTLY on the following manual. Do not make up information outside of this manual.
    
    [SilverGuard Manual]
    {manual_content}
    """
    
    # 대화 기록이 비어있을 때만 시스템 프롬프트를 맨 앞에 넣습니다.
    if len(chat_history) == 0:
        chat_history.append({"role": "system", "content": system_prompt})
        
    chat_history.append({"role": "user", "content": user_msg})
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=chat_history
    )
    
    ai_response = response.choices[0].message.content
    
    chat_history.append({"role": "assistant", "content": ai_response})
    
    return {
        "status": "success",
        "reply": ai_response
    }