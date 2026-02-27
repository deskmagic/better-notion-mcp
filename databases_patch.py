import sys

content = sys.stdin.read()

# The pattern to replace
search_pattern = """    const textProps = Object.entries(dataSource.properties || {})
      .filter(([_, prop]: [string, any]) => ['title', 'rich_text'].includes(prop.type))
      .map(([name]) => name)"""

# The replacement pattern (using Object.keys implementation as it was the fastest)
replace_pattern = """    const textProps: string[] = []
    if (dataSource.properties) {
      for (const name of Object.keys(dataSource.properties)) {
        const prop = (dataSource.properties as any)[name]
        if (['title', 'rich_text'].includes(prop.type)) {
          textProps.push(name)
        }
      }
    }"""

if search_pattern in content:
    new_content = content.replace(search_pattern, replace_pattern)
    print(new_content)
else:
    # If exact match fails due to whitespace differences, try a more robust approach or just print original to avoid empty file
    print("Pattern not found", file=sys.stderr)
    sys.exit(1)
