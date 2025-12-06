"""
Model Manager - Handles AI model configuration and selection
"""

import os
from typing import List, Dict, Optional
from openai import OpenAI
import anthropic
import google.generativeai as genai
from groq import Groq


class ModelManager:
    """Manages AI model connections and configurations"""

    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self.groq_client = None
        self.google_client = None

        # Initialize clients if API keys are available
        # Note: OpenAI and Anthropic are not currently integrated (will be added in future)
        # Only Groq and Google AI are currently supported
        try:
            if os.getenv("OPENAI_API_KEY"):
                # OpenAI integration coming soon - not currently active
                self.openai_client = None
                print("ℹ️  OpenAI API key found but OpenAI integration is not yet active (coming soon)")
        except Exception as e:
            print(f"Warning: Failed to initialize OpenAI client: {e}")

        try:
            if os.getenv("ANTHROPIC_API_KEY"):
                # Anthropic integration coming soon - not currently active
                self.anthropic_client = None
                print("ℹ️  Anthropic API key found but Anthropic integration is not yet active (coming soon)")
        except Exception as e:
            print(f"Warning: Failed to initialize Anthropic client: {e}")

        try:
            groq_api_key = os.getenv("GROQ_API_KEY")
            if groq_api_key:
                if groq_api_key.strip() == "" or groq_api_key == "your-groq-api-key-here" or "your" in groq_api_key.lower():
                    print("⚠️  Warning: GROQ_API_KEY is not set or is using placeholder value")
                    self.groq_client = None
                else:
                    self.groq_client = Groq(api_key=groq_api_key)
                    print("✅ Groq client initialized successfully")
            else:
                print("⚠️  Warning: GROQ_API_KEY environment variable not found")
        except Exception as e:
            print(f"❌ Warning: Failed to initialize Groq client: {e}")
            self.groq_client = None

        try:
            google_api_key = os.getenv("GOOGLE_API_KEY")
            if google_api_key:
                if google_api_key.strip() == "" or google_api_key == "your-google-api-key-here" or "your" in google_api_key.lower():
                    print("⚠️  Warning: GOOGLE_API_KEY is not set or is using placeholder value")
                    self.google_client = None
                else:
                    genai.configure(api_key=google_api_key)
                    self.google_client = genai
                    print("✅ Google AI client initialized successfully")
            else:
                print("⚠️  Warning: GOOGLE_API_KEY environment variable not found")
        except Exception as e:
            print(f"❌ Warning: Failed to initialize Google AI client: {e}")
            self.google_client = None

        # Print summary of available providers
        available_providers = []
        if self.groq_client:
            available_providers.append("Groq")
        if self.google_client:
            available_providers.append("Google AI")
        if available_providers:
            print(f"✅ Currently active AI providers: {', '.join(available_providers)}")
        else:
            print("⚠️  Warning: No AI providers are currently configured. Please set GROQ_API_KEY or GOOGLE_API_KEY in your .env file")
        print("ℹ️  Note: OpenAI and Anthropic integrations are coming soon")

        # Model registry
        self.models = {
            "gpt-3.5-turbo": {
                "id": "gpt-3.5-turbo",
                "name": "GPT-3.5 Turbo",
                "provider": "OpenAI",
                "category": "basic",
                "client": "openai",
                "max_tokens": 16385,
                "cost": {"input": 0.0005, "output": 0.0015},
            },
            "gpt-4-turbo": {
                "id": "gpt-4-turbo",
                "name": "GPT-4 Turbo",
                "provider": "OpenAI",
                "category": "standard",
                "client": "openai",
                "max_tokens": 128000,
                "cost": {"input": 0.01, "output": 0.03},
            },
            "gpt-4o": {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "OpenAI",
                "category": "advanced",
                "client": "openai",
                "max_tokens": 128000,
                "cost": {"input": 0.005, "output": 0.015},
            },
            "claude-3-haiku": {
                "id": "claude-3-haiku",
                "name": "Claude 3 Haiku",
                "provider": "Anthropic",
                "category": "basic",
                "client": "anthropic",
                "max_tokens": 200000,
                "cost": {"input": 0.00025, "output": 0.00125},
            },
            "claude-3-sonnet": {
                "id": "claude-3-sonnet",
                "name": "Claude 3 Sonnet",
                "provider": "Anthropic",
                "category": "standard",
                "client": "anthropic",
                "max_tokens": 200000,
                "cost": {"input": 0.003, "output": 0.015},
            },
            "claude-3-opus": {
                "id": "claude-3-opus",
                "name": "Claude 3 Opus",
                "provider": "Anthropic",
                "category": "advanced",
                "client": "anthropic",
                "max_tokens": 200000,
                "cost": {"input": 0.015, "output": 0.075},
            },
            "mixtral-8x7b": {
                "id": "mixtral-8x7b",
                "name": "Llama 3.1 8B Instant",
                "provider": "Groq",
                "category": "basic",
                "client": "groq",
                "groq_model_name": "llama-3.1-8b-instant",  # Valid Groq API model name
                "max_tokens": 8192,
                "cost": {"input": 0.00024, "output": 0.00024},
            },
            "llama-3.3-70b": {
                "id": "llama-3.3-70b",
                "name": "Llama 3.3 70B Versatile",
                "provider": "Groq",
                "category": "standard",
                "client": "groq",
                "groq_model_name": "llama-3.3-70b-versatile",  # Valid Groq API model name
                "max_tokens": 131072,
                "cost": {"input": 0.00059, "output": 0.00079},
            },
            "gemini-pro": {
                "id": "gemini-pro",
                "name": "Gemini 1.5 Flash",
                "provider": "Google",
                "category": "standard",
                "client": "google",
                "google_model_name": "gemini-1.5-flash",  # Correct Google AI model name
                "max_tokens": 32768,
                "cost": {"input": 0.0005, "output": 0.0015},
            },
        }

        # Plan-based access
        self.plan_access = {
            "free": ["basic"],
            "standard": ["basic", "standard"],
            "pro": ["basic", "standard", "advanced"],
            "enterprise": ["basic", "standard", "advanced", "enterprise"],
        }
        
        # Provider restrictions for free tier unauthenticated (only Groq)
        # Authenticated free tier users can use Groq and Google AI
        # Note: OpenAI and Anthropic are not currently integrated (coming soon)
        self.free_tier_unauthenticated_providers = ["Groq"]
        self.free_tier_authenticated_providers = ["Groq", "Google"]  # Only Groq and Google currently supported

    def get_available_models(self, user_plan: str = "free", is_authenticated: bool = True) -> List[Dict]:
        """Get models available for a user's plan"""
        allowed_categories = self.plan_access.get(user_plan, ["basic"])

        available = []
        for model_id, model_config in self.models.items():
            if model_config["category"] in allowed_categories:
                # For free tier unauthenticated, only allow Groq
                # For free tier authenticated, allow Groq and OpenAI
                if user_plan == "free":
                    if not is_authenticated:
                        if model_config["provider"] not in self.free_tier_unauthenticated_providers:
                            continue
                    else:
                        if model_config["provider"] not in self.free_tier_authenticated_providers:
                            continue
                
                # Check if client is available
                # Note: Only Groq and Google AI are currently integrated
                client_available = False
                if model_config["client"] == "openai":
                    # OpenAI not currently integrated (coming soon)
                    client_available = False
                elif model_config["client"] == "anthropic":
                    # Anthropic not currently integrated (coming soon)
                    client_available = False
                elif model_config["client"] == "groq" and self.groq_client:
                    client_available = True
                elif model_config["client"] == "google" and self.google_client:
                    client_available = True

                available.append(
                    {
                        "id": model_config["id"],
                        "name": model_config["name"],
                        "provider": model_config["provider"],
                        "category": model_config["category"],
                        "maxTokens": model_config["max_tokens"],
                        "cost": model_config["cost"],
                        "available": client_available,
                    }
                )

        return available

    def get_model_config(self, model_id: str) -> Optional[Dict]:
        """Get configuration for a specific model"""
        return self.models.get(model_id)

    def get_client(self, model_id: str):
        """Get the appropriate client for a model"""
        model_config = self.get_model_config(model_id)
        if not model_config:
            raise ValueError(f"Model {model_id} not found")

        client_type = model_config["client"]
        if client_type == "openai":
            return self.openai_client
        elif client_type == "anthropic":
            return self.anthropic_client
        elif client_type == "groq":
            return self.groq_client
        elif client_type == "google":
            return self.google_client
        else:
            raise ValueError(f"Unknown client type: {client_type}")

    def get_fallback_models(self, primary_model_id: str, user_plan: str = "free", is_authenticated: bool = True) -> List[str]:
        """
        Get list of fallback models in order of preference
        Returns models that are available and accessible for the user's plan
        """
        available_models = self.get_available_models(user_plan, is_authenticated)
        available_model_ids = [m["id"] for m in available_models if m.get("available", False) and m.get("enabled", True)]
        
        # Remove primary model from fallback list
        fallback_models = [m for m in available_model_ids if m != primary_model_id]
        
        # Prioritize: Groq (fastest) > Google > OpenAI (coming soon) > Anthropic (coming soon)
        # Note: Only Groq and Google are currently integrated
        priority_order = {
            "groq": 1,
            "google": 2,
            "openai": 99,  # Not currently integrated
            "anthropic": 99,  # Not currently integrated
        }
        
        def get_priority(model_id: str) -> int:
            config = self.get_model_config(model_id)
            if config:
                return priority_order.get(config.get("client", ""), 99)
            return 99
        
        # Sort by priority, then by category (basic > standard > advanced)
        fallback_models.sort(key=lambda m: (
            get_priority(m),
            {"basic": 1, "standard": 2, "advanced": 3, "enterprise": 4}.get(
                self.get_model_config(m).get("category", "basic"), 5
            )
        ))
        
        return fallback_models

