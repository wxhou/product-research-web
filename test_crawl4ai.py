#!/usr/bin/env python3
"""Test script for Crawl4AI web crawling service."""

import requests


def crawl_urls(urls: list[str], priority: int = 10):
    """Submit crawl jobs to Crawl4AI and return results."""
    base_url = "http://192.168.0.124:11235"

    # Submit crawl job
    response = requests.post(
        f"{base_url}/crawl",
        json={"urls": urls, "priority": priority}
    )

    if response.status_code == 200:
        data = response.json()

        if "results" in data:
            results = data["results"]
            print("Crawl job completed. Results:")
            for result in results:
                print(f"\n--- Result ---")
                print(f"URL: {result.get('url', 'N/A')}")
                print(f"Status: {result.get('status', 'N/A')}")

                # Handle different content formats
                markdown = result.get('markdown')
                content = result.get('content')
                text = result.get('text')

                print(f"Success: {result.get('success')}")
                print(f"Status code: {result.get('status_code')}")

                if isinstance(markdown, str):
                    content_length = len(markdown)
                    print(f"Content length: {content_length} chars")
                    print(f"Content preview: {markdown[:200]}...")
                elif isinstance(content, str):
                    content_length = len(content)
                    print(f"Content length: {content_length} chars")
                    print(f"Content preview: {content[:200]}...")
                elif isinstance(text, str):
                    content_length = len(text)
                    print(f"Content length: {content_length} chars")
                    print(f"Content preview: {text[:200]}...")
                elif isinstance(markdown, dict):
                    print(f"\n--- Markdown Fields Comparison ---")
                    for key in ['raw_markdown', 'markdown_with_citations', 'references_markdown', 'fit_markdown']:
                        if key in markdown:
                            val = markdown[key]
                            if isinstance(val, str):
                                lines = val.count('\n')
                                print(f"  {key}: {len(val)} chars, {lines} lines")
                                print(f"    Preview: {val[:150].replace(chr(10), ' ')}...")
                    print(f"  fit_html: {len(markdown.get('fit_html', ''))} chars")

                    # Show markdown_with_citations more detail
                    if 'markdown_with_citations' in markdown:
                        print(f"\n--- markdown_with_citations sample (with citations) ---")
                        sample = markdown['markdown_with_citations'][:500]
                        print(sample.replace('\n', ' ') + "...")

                    # Show extracted_content if available
                    extracted = result.get('extracted_content')
                    if extracted and isinstance(extracted, str):
                        print(f"\n--- extracted_content ---")
                        print(f"  {len(extracted)} chars, {extracted.count(chr(10))} lines")
                        print(f"  Preview: {extracted[:150].replace(chr(10), ' ')}...")
        else:
            task_id = data["task_id"]
            print(f"Crawl job submitted. Task ID: {task_id}")

            # Poll for results
            while True:
                result = requests.get(f"{base_url}/task/{task_id}")
                if result.status_code == 200:
                    result_data = result.json()
                    if result_data.get("status") == "completed":
                        print("\nTask completed!")
                        for r in result_data.get("results", []):
                            print(f"\n--- Result ---")
                            print(f"URL: {r.get('url', 'N/A')}")
                            print(f"Status: {r.get('status', 'N/A')}")
                        break
                    elif result_data.get("status") == "running":
                        print("Task still running...")
                        import time
                        time.sleep(2)
                    else:
                        print(f"Task failed or unknown status: {result_data}")
                        break
                else:
                    print(f"Failed to get task status: {result.status_code}")
                    break
    else:
        print(f"Failed to submit crawl job: {response.status_code}")
        print(f"Response: {response.text}")


if __name__ == "__main__":
    # Test with baidu.com
    urls = ["https://www.baidu.com", "https://www.qq.com"]
    print(f"Testing Crawl4AI at http://192.168.0.124:11235")
    print(f"Crawling URLs: {urls}")
    print("-" * 50)
    crawl_urls(urls)
