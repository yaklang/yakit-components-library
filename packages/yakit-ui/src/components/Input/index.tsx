import { Input as BaseInput, OTP, Password, TextArea } from './Input';
import { Search, SearchTrigger } from './Search';
import { Select } from './Select';
import type {
  InputProps,
  InputRef,
  InputSelectProps,
  InputSize,
  InputStatus,
  OTPProps,
  OTPRef,
  PasswordProps,
  SearchProps,
  SearchTriggerProps,
  TextAreaProps,
  TextAreaRef,
} from './type';

type CompoundedInput = typeof BaseInput & {
  OTP: typeof OTP;
  Password: typeof Password;
  Search: typeof Search;
  SearchTrigger: typeof SearchTrigger;
  Select: typeof Select;
  TextArea: typeof TextArea;
};

export const Input = BaseInput as CompoundedInput;
Input.TextArea = TextArea;
Input.Search = Search;
Input.Password = Password;
Input.OTP = OTP;
Input.SearchTrigger = SearchTrigger;
Input.Select = Select;

export type {
  InputProps,
  InputRef,
  InputSelectProps,
  InputSize,
  InputStatus,
  OTPProps,
  OTPRef,
  PasswordProps,
  SearchProps,
  SearchTriggerProps,
  TextAreaProps,
  TextAreaRef,
};
export default Input;
