'use client';
import { Children, forwardRef, isValidElement } from 'react';
import {
  Button as RadixButton,
  Checkbox,
  Select as RadixSelect,
  Text,
  TextArea as RadixTextArea,
  TextField,
  Theme,
  VisuallyHidden,
} from '@radix-ui/themes';
import Link from 'next/link';
const classes = (base, extra) => `${base}${extra ? ` ${extra}` : ''}`;

export function UIProvider({ children }) {
  return (
    <Theme
      className="community-theme"
      appearance="dark"
      accentColor="yellow"
      grayColor="sage"
      radius="medium"
      scaling="100%"
    >
      {children}
    </Theme>
  );
}
export const Button = forwardRef(function Button({ className, type = 'submit', ...props }, ref) {
  return (
    <RadixButton
      ref={ref}
      type={type}
      variant="soft"
      size="2"
      className={classes('ui-button', className)}
      {...props}
    />
  );
});
export const ActionLink = forwardRef(function ActionLink({ className, href, ...props }, ref) {
  return (
    <RadixButton asChild variant="soft" size="2" className={classes('ui-button', className)}>
      <Link ref={ref} href={href} {...props} />
    </RadixButton>
  );
});
export const ExternalButton = forwardRef(function ExternalButton({ className, ...props }, ref) {
  return (
    <RadixButton asChild variant="soft" size="2" className={classes('ui-button', className)}>
      <a ref={ref} {...props} />
    </RadixButton>
  );
});
export const Input = forwardRef(function Input(
  { type = 'text', className, onChange, ...props },
  ref,
) {
  if (type === 'file')
    return (
      <VisuallyHidden asChild>
        <input ref={ref} type="file" className={className} onChange={onChange} {...props} />
      </VisuallyHidden>
    );
  if (type === 'checkbox')
    return (
      <Checkbox
        ref={ref}
        size="2"
        className={classes('ui-checkbox', className)}
        onCheckedChange={(checked) =>
          onChange?.({
            target: { checked: checked === true, name: props.name },
            currentTarget: { checked: checked === true, name: props.name },
          })
        }
        {...props}
      />
    );
  return (
    <TextField.Root
      ref={ref}
      type={type}
      size="3"
      variant="surface"
      className={classes('ui-input', className)}
      onChange={onChange}
      {...props}
    />
  );
});
export const TextArea = forwardRef(function TextArea({ className, ...props }, ref) {
  return (
    <RadixTextArea
      ref={ref}
      size="3"
      variant="surface"
      className={classes('ui-textarea', className)}
      {...props}
    />
  );
});
export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return <Text as="label" ref={ref} className={classes('ui-label', className)} {...props} />;
});
export const Select = forwardRef(function Select(
  { children, className, value, defaultValue, onChange, name, required, disabled, ...props },
  ref,
) {
  const options = Children.toArray(children).filter(isValidElement);
  return (
    <RadixSelect.Root
      value={value}
      defaultValue={defaultValue}
      name={name}
      required={required}
      disabled={disabled}
      onValueChange={(selected) =>
        onChange?.({ target: { value: selected, name }, currentTarget: { value: selected, name } })
      }
    >
      <RadixSelect.Trigger
        ref={ref}
        variant="surface"
        className={classes('ui-select', className)}
        {...props}
      />
      <RadixSelect.Content position="popper" className="ui-select-menu">
        {options.map((option) => (
          <RadixSelect.Item
            key={option.props.value ?? option.props.children}
            value={String(option.props.value ?? option.props.children)}
            disabled={option.props.disabled}
          >
            {option.props.children}
          </RadixSelect.Item>
        ))}
      </RadixSelect.Content>
    </RadixSelect.Root>
  );
});
