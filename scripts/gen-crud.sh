#!/usr/bin/env bash

set -e

name=$1
placeholder="story"
capitalized_placeholder="${placeholder^}"
form_component_template=src/app/_components/create-story.tsx
form_style_template=src/app/_components/create-story.module.css
page_template="src/app/story/[storyId]/page.tsx"
page_style_template="src/app/story/[storyId]/page.module.css"
api_template="src/server/api/routers/story.ts"

templates=(
  "$form_component_template"
  "$form_style_template"
  "$page_template"
  "$page_style_template"
  "$api_template"
)

mkdir -p "src/app/$name/[${name}Id]"

for template in "${templates[@]}"
do
  if [ ! -f "$template" ]; then
    echo "Template $template not found"
    exit 1
  fi
  
  dest_name="${template//$placeholder/$name}"

  if [ -f "$dest_name" ]; then
    echo "File $dest_name already exists. Skipping."
    continue
  fi

  cp "$template" "$dest_name"
  sed -i "s/$placeholder/$name/g" "$dest_name"
  
  type_name=${name^}
  sed -i "s/$capitalized_placeholder/$type_name/g" "$dest_name"

  echo "Created $dest_name"
done
