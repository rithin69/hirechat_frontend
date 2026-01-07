"interview": f"""Write a professional interview invitation email.

Candidate: {context['applicant_name']}
Position: {context['job_title']}
Company: {context['company_name']}

Requirements for the email:
- Do NOT start with "Hi", "Hello", "Dear" or any greeting.
- Do NOT include the candidate's name in the greeting.
- Do NOT include placeholders like "[insert date and time]" – use neutral wording like "at a time that works for you" instead.
- Do NOT include placeholders like "[Your Name]" or "[Your Position]".
- Do NOT add any closing signature ("Best regards", "Sincerely", names, roles).
- Just write the main body text.

The email should:
- Invite the candidate to an interview for the role.
- Mention that the interview will be virtual and around one hour.
- Ask the candidate to reply with their availability.
- Sound clear, respectful and concise.

Format:
Line 1: "Subject: <subject text>"
Line 2 onwards: the body of the email.
"""
