import re

with open("src/types.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the block of ApiKey types
# export type CredentialType = 'PLATFORM_TOKEN' | 'PROVIDER_API_KEY'
# export type ApiKeyProvider = 'Google Gemini' | 'OpenAI' | 'NVIDIA' | 'Other'
# export type ApiKeyEnvironment = 'Development' | 'Staging' | 'Production'
# export type ApiKeyScope = 'run:agents' | 'read:project' | 'write:project' | 'manage:keys' | 'admin'
# export type ApiKeyStatus = 'Active' | 'Revoked'

content = re.sub(r"export type CredentialType = 'PLATFORM_TOKEN' \| 'PROVIDER_API_KEY'\n", "", content)
content = re.sub(r"export type ApiKeyProvider = 'Google Gemini' \| 'OpenAI' \| 'NVIDIA' \| 'Other'\n", "", content)
content = re.sub(r"export type ApiKeyEnvironment = 'Development' \| 'Staging' \| 'Production'\n", "", content)
content = re.sub(r"export type ApiKeyScope = 'run:agents' \| 'read:project' \| 'write:project' \| 'manage:keys' \| 'admin'\n", "", content)
content = re.sub(r"export type ApiKeyStatus = 'Active' \| 'Revoked'\n", "", content)

# Remove interfaces: CredentialMetadata, ApiKey, AddProviderApiKeyPayload, CreateApiKeyPayload
content = re.sub(r"export interface CredentialMetadata \{.*?\}\n\n", "", content, flags=re.DOTALL)
content = re.sub(r"export type ApiKey = CredentialMetadata\n", "", content)
content = re.sub(r"export interface AddProviderApiKeyPayload \{.*?\}\n", "", content, flags=re.DOTALL)
content = re.sub(r"export interface CreateApiKeyPayload \{.*?\}\n", "", content, flags=re.DOTALL)

with open("src/types.ts", "w", encoding="utf-8") as f:
    f.write(content)
