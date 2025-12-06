"""
Chat Handler - Handles streaming chat responses from AI models
"""

from typing import Generator, Optional
import threading
import queue
import time
from llm.model_manager import ModelManager
from llm.prompts import get_system_prompt, get_security_prompt


class ChatHandler:
    """Handles chat interactions with AI models"""

    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager

    def stream_response(
        self, message: str, model_id: str, user_plan: str, mode: str = "normal", is_authenticated: bool = True, timeout: int = 30
    ) -> Generator[str, None, None]:
        """
        Stream response from AI model with automatic fallback on timeout
        
        Args:
            message: User's message
            model_id: ID of the primary model to use
            user_plan: User's subscription plan
            mode: Chat mode (normal, security, code)
            is_authenticated: Whether user is authenticated
            timeout: Timeout in seconds before trying fallback (default: 30)
        """
        # Get appropriate system prompt based on mode
        system_prompt = self._get_system_prompt_for_mode(mode)
        
        # Add explicit instruction to check topic relevance
        enhanced_prompt = f"""{system_prompt}

USER QUESTION: "{message}"

Before responding, check if this question is related to cybersecurity, application security, secure coding, or security vulnerabilities. If it's NOT security-related, respond with: "I'm a security-focused assistant. I specialize in cybersecurity topics like vulnerabilities, secure coding, threat modeling, security best practices, and security code review. Please ask me a security-related question, and I'll be happy to help!"

If the question IS security-related, provide a helpful, detailed answer."""

        # Try primary model first
        models_to_try = [model_id] + self.model_manager.get_fallback_models(model_id, user_plan, is_authenticated)
        
        last_error = None
        for attempt, current_model_id in enumerate(models_to_try):
            try:
                model_config = self.model_manager.get_model_config(current_model_id)
                if not model_config:
                    continue

                client = self.model_manager.get_client(current_model_id)
                if not client:
                    continue

                # Try streaming with timeout
                if attempt > 0:
                    yield f"\n\n[Switching to {model_config.get('name', current_model_id)} due to timeout...]\n\n"
                
                # Use timeout wrapper for streaming
                yield from self._stream_with_timeout(
                    client, message, current_model_id, enhanced_prompt, model_config, timeout
                )
                return  # Success, exit
                
            except TimeoutError:
                last_error = f"Model {current_model_id} timed out after {timeout} seconds"
                print(f"⚠️  {last_error}, trying fallback...")
                continue
            except Exception as e:
                last_error = str(e)
                print(f"⚠️  Error with model {current_model_id}: {last_error}, trying fallback...")
                continue
        
        # All models failed
        error_msg = f"All available models failed. Last error: {last_error or 'Unknown error'}"
        yield f"\n\n[Error: {error_msg}]"
        raise Exception(error_msg)

    def _stream_with_timeout(
        self, client, message: str, model_id: str, system_prompt: str, model_config: dict, timeout: int
    ) -> Generator[str, None, None]:
        """Stream response with timeout protection"""
        result_queue = queue.Queue()
        error_queue = queue.Queue()
        stop_event = threading.Event()
        completion_event = threading.Event()
        
        def stream_worker():
            try:
                if model_config["client"] == "openai":
                    stream = client.chat.completions.create(
                        model=model_id,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": message},
                        ],
                        stream=True,
                        temperature=0.7,
                        timeout=timeout,
                    )
                    for chunk in stream:
                        if stop_event.is_set():
                            break
                        if chunk.choices[0].delta.content:
                            result_queue.put(chunk.choices[0].delta.content)
                elif model_config["client"] == "anthropic":
                    with client.messages.stream(
                        model=model_id,
                        max_tokens=4096,
                        system=system_prompt,
                        messages=[{"role": "user", "content": message}],
                        timeout=timeout,
                    ) as stream:
                        for text in stream.text_stream:
                            if stop_event.is_set():
                                break
                            result_queue.put(text)
                elif model_config["client"] == "groq":
                    groq_model_name = model_config.get("groq_model_name", model_id)
                    stream = client.chat.completions.create(
                        model=groq_model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": message},
                        ],
                        stream=True,
                        temperature=0.7,
                        timeout=timeout,
                    )
                    for chunk in stream:
                        if stop_event.is_set():
                            break
                        if chunk.choices and len(chunk.choices) > 0:
                            if chunk.choices[0].delta and chunk.choices[0].delta.content:
                                result_queue.put(chunk.choices[0].delta.content)
                elif model_config["client"] == "google":
                    # Get the actual Google model name from config
                    google_model_name = model_config.get("google_model_name", model_id)
                    model = client.GenerativeModel(google_model_name)
                    full_prompt = f"{system_prompt}\n\nUser: {message}\n\nAssistant:"
                    response = model.generate_content(
                        full_prompt, stream=True, generation_config={"temperature": 0.7}
                    )
                    for chunk in response:
                        if stop_event.is_set():
                            break
                        if chunk.text:
                            result_queue.put(chunk.text)
                
                completion_event.set()
            except Exception as e:
                error_queue.put(e)
                completion_event.set()
        
        # Start streaming in background thread
        thread = threading.Thread(target=stream_worker, daemon=True)
        thread.start()
        
        start_time = time.time()
        has_received_data = False
        last_chunk_time = time.time()
        
        while True:
            # Check for timeout - if no data received within timeout period
            elapsed = time.time() - start_time
            time_since_last_chunk = time.time() - last_chunk_time
            
            if elapsed > timeout and not has_received_data:
                stop_event.set()
                raise TimeoutError(f"Model {model_id} did not respond within {timeout} seconds")
            
            # If we've received data but no new chunks for too long, consider it done
            if has_received_data and time_since_last_chunk > 10 and completion_event.is_set():
                break
            
            # Check for errors
            if not error_queue.empty():
                error = error_queue.get()
                stop_event.set()
                raise error
            
            # Check if thread completed
            if completion_event.is_set() and result_queue.empty():
                break
            
            # Get next chunk
            try:
                chunk = result_queue.get(timeout=0.5)
                has_received_data = True
                last_chunk_time = time.time()
                yield chunk
            except queue.Empty:
                # Check if thread is still alive
                if not thread.is_alive() and result_queue.empty() and completion_event.is_set():
                    break
                continue

    def _get_system_prompt_for_mode(self, mode: str) -> str:
        """Get system prompt based on chat mode"""
        if mode == "security":
            return get_security_prompt()
        elif mode == "code":
            return get_system_prompt("code")
        else:
            return get_system_prompt("normal")

    def _stream_openai(
        self, client, message: str, model_id: str, system_prompt: str
    ) -> Generator[str, None, None]:
        """Stream response from OpenAI models"""
        try:
            stream = client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                stream=True,
                temperature=0.7,
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    def _stream_anthropic(
        self, client, message: str, model_id: str, system_prompt: str
    ) -> Generator[str, None, None]:
        """Stream response from Anthropic models"""
        try:
            with client.messages.stream(
                model=model_id,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": message}],
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    def _stream_groq(
        self, client, message: str, model_id: str, system_prompt: str
    ) -> Generator[str, None, None]:
        """Stream response from Groq models"""
        try:
            # Get the actual Groq model name from config
            model_config = self.model_manager.get_model_config(model_id)
            groq_model_name = model_config.get("groq_model_name", model_id)
            
            stream = client.chat.completions.create(
                model=groq_model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                stream=True,
                temperature=0.7,
            )

            for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    if chunk.choices[0].delta and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
        except Exception as e:
            error_msg = str(e)
            # Provide more helpful error messages
            if "Invalid API Key" in error_msg or "401" in error_msg or "invalid_api_key" in error_msg:
                yield f"\n\n[Error: Invalid Groq API Key. Please check your GROQ_API_KEY environment variable in the .env file.]"
            elif "model" in error_msg.lower() and "not found" in error_msg.lower():
                yield f"\n\n[Error: Groq model '{groq_model_name}' not found. Please check the model name in the configuration.]"
            else:
                yield f"\n\n[Error: {error_msg}]"

    def _stream_google(
        self, client, message: str, model_id: str, system_prompt: str
    ) -> Generator[str, None, None]:
        """Stream response from Google models"""
        try:
            # Get the actual Google model name from config
            model_config = self.model_manager.get_model_config(model_id)
            google_model_name = model_config.get("google_model_name", model_id) if model_config else model_id
            
            model = client.GenerativeModel(google_model_name)
            full_prompt = f"{system_prompt}\n\nUser: {message}\n\nAssistant:"

            response = model.generate_content(
                full_prompt, stream=True, generation_config={"temperature": 0.7}
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

