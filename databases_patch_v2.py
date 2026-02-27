import sys

# Read the entire file content
content = sys.stdin.read()

# Define the search pattern (exact match from the file reading)
search_pattern = """    const textProps = Object.entries(dataSource.properties || {})
      .filter(([_, prop]: [string, any]) => ['title', 'rich_text'].includes(prop.type))
      .map(([name]) => name)"""

# Define the replacement pattern (Object.keys implementation)
replace_pattern = """    const textProps: string[] = []
    if (dataSource.properties) {
      for (const name of Object.keys(dataSource.properties)) {
        const prop = (dataSource.properties as any)[name]
        if (['title', 'rich_text'].includes(prop.type)) {
          textProps.push(name)
        }
      }
    }"""

# Perform the replacement
if search_pattern in content:
    new_content = content.replace(search_pattern, replace_pattern)
    print(new_content)
else:
    # If exact match fails, try a manual construction based on surrounding context
    # Looking for:
    #     const dataSource: any = await (notion as any).dataSources.retrieve({
    #       data_source_id: dataSourceId
    #     })

    context_start = "    const dataSource: any = await (notion as any).dataSources.retrieve({\n      data_source_id: dataSourceId\n    })\n\n"

    start_index = content.find(context_start)
    if start_index != -1:
        # Found the context, now look for the next "if (textProps.length > 0) {"
        end_marker = "    if (textProps.length > 0) {"
        end_index = content.find(end_marker, start_index)

        if end_index != -1:
            # Reconstruct the file with the replacement inserted between context and end marker
            # We need to preserve the context start but remove the old implementation

            # The part we want to replace is between context_start and end_marker
            # But wait, search_pattern failed, so let's just locate where it SHOULD be.

            prefix = content[:start_index + len(context_start)]
            suffix = content[end_index:]

            print(prefix + replace_pattern + "\n\n" + suffix)
        else:
             print("End marker not found", file=sys.stderr)
             sys.exit(1)
    else:
        print("Context start not found", file=sys.stderr)
        sys.exit(1)
