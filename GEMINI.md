# GEMINI.md

## Project Overview

This project is a Gemini CLI extension that integrates the Endor Labs MCP server. It enables advanced code analysis and vulnerability scanning capabilities directly from the terminal through natural language interactions. The extension supports multiple languages, including Go, Java, JavaScript, Python, and TypeScript.

## Building and Running

This project is a CLI extension and does not have a traditional build process.

### Prerequisites

- **Gemini CLI:** The Gemini CLI must be installed.
- **Endor Labs CLI (`endorctl`):** The `endorctl` tool must be installed and authenticated with Endor Labs.

### Installation

To install and run this extension, use the following command:

```bash
gemini extensions install https://github.com/endorlabs/gemini-extension.git
```

For local development, you can clone the repository and link the extension:

```bash
git clone https://github.com/endorlabs/endor-labs-gemini-extension.git
cd endor-labs-gemini-extension
gemini extensions link .
```

### Usage

Once installed, you can use natural language prompts within the Gemini CLI to interact with Endor Labs:

#### Initialize Endor Labs
```bash
gemini> Initialize Endor Labs with Google authentication
gemini> Set up Endor Labs for this project
```

#### Security Scanning
```bash
gemini> Scan my project for security vulnerabilities
gemini> Check dependencies for known CVEs
gemini> Generate a security report for this repository
```

## Design Context

### Users
- **Audience**: The Muslim Ummah in Nigeria and globally.
- **Context**: Users seeking authentic Islamic knowledge, Quranic recitations, and lectures.
- **Job to be Done**: Listen to lectures, stream Quran, and access educational resources seamlessly on mobile devices (iOS/Android).

### Brand Personality
- **Authoritative & Trustworthy**: As the "biggest Islamic media company in Nigeria," the design must exude credibility and professionalism.
- **Spiritual & Calm**: The interface should encourage focus and reflection, avoiding chaotic or "loud" design elements.
- **Modern & Premium**: A best-in-class experience that competes with global media apps (like Apple Music or Spotify) while retaining its unique identity.

### Aesthetic Direction
- **"Native + Cultural"**:
    - **Foundation**: Clean, native structure akin to Apple Music/Podcasts. heavy use of native navigation stacks, large titles, and high-quality lists.
    - **Flourish**: Subtle, elegant Islamic motifs (e.g., geometric patterns at low opacity, refined typography) used as accents, not distractions.
    - **Theme**: **System-Adaptive**. Must support both **Light** and **Dark** modes perfectly. High contrast is essential for readability in bright sunlight (Light mode).
- **Color Palette**:
    - Primary: Native System Colors (Black/White backgrounds).
    - Brand Accent: **#30D158** (Islamic Green/iOS Green).
    - Avoid: Neon effects, excessive gradients, or "slop" aesthetics.

### Design Principles
1.  **Content First, Decoration Second**: The lecture/recitation is the hero. Islamic motifs should frame the content, not compete with it.
2.  **Platform Fidelity**: Respect iOS and Android patterns. Use native navigation transitions, haptics, and hit targets (min 44px).
3.  **Universal Accessibility**: Support dynamic type sizes and ensuring high contrast (WCAG AA) in both Light and Dark modes.
4.  **Subtle Elegance**: Use "blurs" and "transparencies" (like native iOS materials) rather than heavy drop shadows or solid borders.
5.  **Performance**: Smooth scrolling lists (FlashList/FlatList optimization) are critical for large media libraries.
