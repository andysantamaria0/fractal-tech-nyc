'use client'

import { useState, type KeyboardEvent } from 'react'
import type { TechnicalEnvironment } from '@/lib/hiring-spa/types'

interface TechEditorProps {
  value: TechnicalEnvironment
  onChange: (value: TechnicalEnvironment) => void
}

function TagList({
  label,
  tags,
  onChange,
}: {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  const addTag = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
      setInputValue('')
    }
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="spa-form-field">
      <label className="spa-form-label">{label}</label>
      <div className="spa-tag-list">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="spa-tag">
            {tag}
            <button className="spa-tag-remove" onClick={() => removeTag(i)} aria-label={`Remove ${tag}`}>
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          className="spa-tag-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="Add..."
        />
      </div>
    </div>
  )
}

export default function TechEditor({ value, onChange }: TechEditorProps) {
  const update = (field: keyof TechnicalEnvironment, fieldValue: string[] | string) => {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <div>
      <TagList
        label="Languages"
        tags={value.primaryLanguages}
        onChange={(tags) => update('primaryLanguages', tags)}
      />
      <TagList
        label="Frameworks"
        tags={value.frameworks}
        onChange={(tags) => update('frameworks', tags)}
      />
      <TagList
        label="Infrastructure"
        tags={value.infrastructure}
        onChange={(tags) => update('infrastructure', tags)}
      />
      <TagList
        label="Dev Practices"
        tags={value.devPractices}
        onChange={(tags) => update('devPractices', tags)}
      />
      <div className="spa-form-field">
        <label className="spa-form-label">Open Source Involvement</label>
        <textarea
          className="spa-textarea"
          value={value.openSourceInvolvement}
          onChange={(e) => update('openSourceInvolvement', e.target.value)}
          rows={2}
          placeholder="Describe your open source involvement..."
        />
      </div>
    </div>
  )
}
