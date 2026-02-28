"""
Illinois Voice Phishing Fraud Guide - RAG Loader
Loads sections on-demand based on user query to minimize token usage
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Tuple

class VoicePhishingGuideLoader:
    """Load and route voice phishing guide sections based on user queries"""
    
    def __init__(self, section_index_path: str, section_dir: str = "."):
        """
        Initialize loader with section index and directory
        
        Args:
            section_index_path: Path to section_index.json
            section_dir: Directory containing section files
        """
        self.section_dir = section_dir
        
        # Load section index
        with open(section_index_path, 'r', encoding='utf-8') as f:
            self.index = json.load(f)
        
        self.sections = {s['id']: s for s in self.index['sections']}
        self.legal_terms = self.index['legal_terms']
    
    def _score_relevance(self, query: str, section: Dict) -> float:
        """
        Score how relevant a section is to the query
        Returns score 0-100
        """
        query_lower = query.lower()
        score = 0
        
        # Keyword matches (20 points each)
        for keyword in section.get('keywords', []):
            if keyword.lower() in query_lower:
                score += 20
        
        # Question matches (30 points each)
        for question in section.get('questions', []):
            if question.lower() in query_lower:
                score += 30
        
        # Partial matches (5 points each)
        words = query_lower.split()
        for word in words:
            if len(word) > 3:  # Only meaningful words
                for keyword in section.get('keywords', []):
                    if word in keyword.lower():
                        score += 5
        
        return min(score, 100)  # Cap at 100
    
    def find_relevant_sections(self, query: str, top_n: int = 3) -> List[Tuple[str, float]]:
        """
        Find relevant sections for user query
        
        Returns list of (section_id, relevance_score) tuples
        """
        scores = []
        for section_id, section in self.sections.items():
            score = self._score_relevance(query, section)
            if score > 0:
                scores.append((section_id, score))
        
        # Sort by score, return top N
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_n]
    
    def load_section(self, section_id: str) -> Tuple[str, str, str]:
        """
        Load a section file and return its content
        
        Returns: (title, content, file_name)
        """
        if section_id not in self.sections:
            raise ValueError(f"Section {section_id} not found")
        
        section = self.sections[section_id]
        file_path = os.path.join(self.section_dir, section['file'])
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return section['title'], content, section['file']
    
    def load_relevant_sections(self, query: str, top_n: int = 2) -> str:
        """
        Find and load the most relevant sections for a query
        
        Returns combined text of relevant sections
        """
        relevant = self.find_relevant_sections(query, top_n=top_n)
        
        if not relevant:
            return "No relevant sections found. Please ask about fraud recovery, banking procedures, identity theft, wire transfers, P2P apps, credit cards, or special situations."
        
        combined = f"=== RELEVANT SECTIONS FOR YOUR QUERY ===\n\n"
        
        for section_id, score in relevant:
            title, content, filename = self.load_section(section_id)
            combined += f"[{title.upper()} - Relevance: {score:.0f}%]\n"
            combined += content + "\n\n"
        
        combined += "=== END OF RELEVANT SECTIONS ===\n"
        combined += f"\nNote: This response loaded {len(relevant)} relevant section(s) to minimize token usage."
        
        return combined
    
    def get_all_sections(self) -> List[Dict]:
        """Get list of all available sections"""
        return [
            {
                'id': s['id'],
                'title': s['title'],
                'keywords': s['keywords']
            }
            for s in self.index['sections']
        ]
    
    def load_disclaimer(self) -> str:
        """Load the standard disclaimer for all responses"""
        return """⚠️ DISCLAIMER ⚠️
This guide is educational and for prototype/hackathon purposes only. 
It is NOT official legal advice. Always verify information by contacting:
• Your bank's official fraud department
• FBI Internet Crime Complaint Center: www.ic3.gov
• Local police (311 non-emergency in Chicago)
• Licensed attorneys for legal advice

For urgent issues, contact law enforcement directly.
This guide may contain outdated information - always use current sources."""


# Usage Example:
if __name__ == "__main__":
    # Initialize loader
    loader = VoicePhishingGuideLoader(
        section_index_path="section_index.json",
        section_dir="."
    )
    
    # Example 1: Find relevant sections for a query
    print("Example 1: Loading sections for 'My bank account was hacked'")
    print("-" * 60)
    result = loader.load_relevant_sections("My bank account was hacked", top_n=2)
    print(result[:500] + "...\n")  # Print first 500 chars
    
    # Example 2: List all available sections
    print("\nExample 2: Available sections")
    print("-" * 60)
    sections = loader.get_all_sections()
    for section in sections:
        print(f"  • {section['id']}: {section['title']}")
    
    # Example 3: Get disclaimer
    print("\nExample 3: Standard disclaimer")
    print("-" * 60)
    print(loader.load_disclaimer())
