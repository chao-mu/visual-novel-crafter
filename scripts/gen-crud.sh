#!/usr/bin/env bash

set -e

name=$1
placeholder=$2

if [ "$#" -ne 2 ]; then
  echo "Usage: gen-crud.sh <name> <placeholder>"
  exit 1
fi

capitalized_placeholder="${placeholder^}"
form_component_template="src/app/_components/create-$placeholder.tsx"
form_style_template="src/app/_components/create-$placeholder.module.css"
page_template="src/app/$placeholder/[${placeholder}Id]/page.tsx"
page_style_template="src/app/$placeholder/[${placeholder}Id]/page.module.css"
api_template="src/server/api/routers/$placeholder.ts"

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
