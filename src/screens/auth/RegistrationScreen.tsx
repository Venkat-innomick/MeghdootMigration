import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { Screen } from "../../components/Screen";
import { spacing } from "../../theme/spacing";
import { colors } from "../../theme/colors";
import { mastersService, userService } from "../../api/services";
import {
  AsdMasterItem,
  BlockMasterItem,
  DistrictMasterItem,
  StateMasterItem,
} from "../../types/domain";
import { LANGUAGES } from "../../constants/languages";

type Props = NativeStackScreenProps<AuthStackParamList, "Registration">;

type Option = { id: number; label: string };

const LANGUAGE_ID_BY_CODE: Record<string, number> = {
  en: 2,
  te: 1,
  hi: 4,
  as: 7,
  gu: 8,
  kn: 9,
  ml: 10,
  mr: 5,
  or: 11,
  ta: 12,
  pa: 13,
  bn: 14,
  "ar-EG": 15,
};

const Selector = ({
  title,
  value,
  options,
  onSelect,
  disabled,
  borderColor = colors.border,
}: {
  title: string;
  value: string;
  options: Option[];
  onSelect: (item: Option) => void;
  disabled?: boolean;
  borderColor?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[
          styles.selector,
          { borderColor },
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text
          style={[styles.selectorText, !value && styles.selectorPlaceholder]}
        >
          {value || title}
        </Text>
        <Image
          source={require("../../../assets/images/dropdown.png")}
          style={styles.selectorArrowIcon}
          resizeMode="contain"
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView>
              {options.map((item) => (
                <Pressable
                  key={`${item.id}-${item.label}`}
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export const RegistrationScreen = ({ navigation }: Props) => {
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [mobile, setMobile] = useState("");
  const [village, setVillage] = useState("");
  const [panchayat, setPanchayat] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [selectedLangCode, setSelectedLangCode] = useState("en");
  const [selectedGender, setSelectedGender] = useState<Option | null>(null);
  const [selectedState, setSelectedState] = useState<StateMasterItem | null>(
    null,
  );
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictMasterItem | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Option | null>(null);

  const [genderOptions, setGenderOptions] = useState<Option[]>([]);
  const [stateOptions, setStateOptions] = useState<StateMasterItem[]>([]);
  const [districtOptions, setDistrictOptions] = useState<DistrictMasterItem[]>(
    [],
  );
  const [blockOptions, setBlockOptions] = useState<Option[]>([]);

  const languageLabel = useMemo(
    () =>
      LANGUAGES.find((l) => l.code === selectedLangCode)?.label || "English",
    [selectedLangCode],
  );

  const selectedLanguageID = LANGUAGE_ID_BY_CODE[selectedLangCode] || 2;

  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [genders, states] = await Promise.all([
          mastersService.getGenders(languageLabel),
          mastersService.getStates(languageLabel),
        ]);

        setGenderOptions(
          genders.map((g: any) => ({
            id: g.genderID || g.GenderID,
            label: g.genderName || g.GenderName,
          })),
        );
        setStateOptions(states);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Unable to load master data");
      } finally {
        setLoading(false);
      }
    };

    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setDistrictOptions([]);
    setBlockOptions([]);
    loadMasterData();
  }, [languageLabel]);

  const onStateChange = async (state: StateMasterItem) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setDistrictOptions([]);
    setBlockOptions([]);

    setLoading(true);
    try {
      const districts = await mastersService.getDistricts(
        state.stateID,
        languageLabel,
      );
      setDistrictOptions(districts.filter((d) => d.stateID === state.stateID));
    } catch (error: any) {
      Alert.alert("Error", error.message || "Unable to load districts");
    } finally {
      setLoading(false);
    }
  };

  const onDistrictChange = async (district: DistrictMasterItem) => {
    if (!selectedState) return;
    setSelectedDistrict(district);
    setSelectedBlock(null);
    setBlockOptions([]);

    const isAsd = selectedState.stateID === 28 || selectedState.stateID === 36;

    setLoading(true);
    try {
      if (isAsd) {
        const asd = await mastersService.getAsd(
          district.districtID,
          languageLabel,
        );
        const mapped = (asd as AsdMasterItem[]).map((a: any) => ({
          id: a.asdID || a.AsdID,
          label: a.asdName || a.AsdName,
        }));
        setBlockOptions(mapped);
      } else {
        const blocks = await mastersService.getBlocks(
          district.districtID,
          languageLabel,
        );
        const mapped = (blocks as BlockMasterItem[]).map((b: any) => ({
          id: b.blockID || b.BlockID,
          label: b.blockName || b.BlockName,
        }));
        setBlockOptions(mapped);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Unable to load blocks");
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!mobile) return "Please enter mobile number";
    if (mobile.length !== 10 || !/^([0]|\+91)?[789]\d{9}$/.test(mobile))
      return "Please enter valid mobile number";
    if (!selectedLanguageID) return "Please select language";
    if (!selectedState) return "Please select state";
    if (!selectedDistrict) return "Please select district";
    if (!selectedBlock)
      return selectedState &&
        (selectedState.stateID === 28 || selectedState.stateID === 36)
        ? "Please select ASD"
        : "Please select block";
    if (village.trim().length >= 50)
      return "Village name should be less than 50 characters";
    if (panchayat.trim().length >= 50)
      return "Panchayat name should be less than 50 characters";
    if (!acceptedTerms) return "Please accept the terms and conditions";
    return "";
  };

  const register = async () => {
    const errorText = validate();
    if (errorText) {
      Alert.alert("Validation", errorText);
      return;
    }

    if (!selectedState || !selectedDistrict || !selectedBlock) return;

    const isAsd = selectedState.stateID === 28 || selectedState.stateID === 36;

    const payload: Record<string, unknown> = {
      TitleId: 0,
      GenderID: selectedGender?.id || 0,
      DOB: "",
      FirstName: firstName.trim(),
      MobileNumber: mobile,
      LanguageID: selectedLanguageID,
      StateID: selectedState.stateID,
      DistrictID: selectedDistrict.districtID,
      VillageName: village.trim(),
      PanchayatName: panchayat.trim(),
      UserId: 0,
      Latitude: "",
      Longitude: "",
      VillageID: 0,
      CreatedBy: 0,
      UpdatedBy: 0,
      StateName: selectedState.stateName,
      DistrictName: selectedDistrict.districtName,
      ThumbNailBytes: null,
    };

    if (isAsd) {
      payload.AsdID = selectedBlock.id;
      payload.AsdName = selectedBlock.label;
    } else {
      payload.BlockID = selectedBlock.id;
      payload.BlockName = selectedBlock.label;
    }

    setLoading(true);
    try {
      const response = await userService.register(payload);
      if (response.isSuccessful === false) {
        Alert.alert(
          "Registration failed",
          response.errorMessage || "Unable to register",
        );
      } else {
        Alert.alert("Success", "Registration done successfully");
        navigation.navigate("Login");
      }
    } catch (error: any) {
      Alert.alert("Registration failed", error.message || "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>REGISTRATION</Text>
          <Text style={styles.subtitle}>
            Register to get weather and crop advisory updates
          </Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Enter Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="Mobile"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Select Language*</Text>
            <Selector
              title="Select language"
              value={languageLabel}
              options={LANGUAGES.map((l, idx) => ({
                id: idx + 1,
                label: l.label,
              }))}
              onSelect={(item) => {
                const found = LANGUAGES.find((l) => l.label === item.label);
                setSelectedLangCode(found?.code || "en");
              }}
              borderColor={colors.primary}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Gender</Text>
            <Selector
              title="Gender"
              value={selectedGender?.label || ""}
              options={genderOptions}
              onSelect={(item) => setSelectedGender(item)}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Select State*</Text>
            <Selector
              title="Select state*"
              value={selectedState?.stateName || ""}
              options={stateOptions.map((s) => ({
                id: s.stateID,
                label: s.stateName,
              }))}
              onSelect={(item) => {
                const state = stateOptions.find((s) => s.stateID === item.id);
                if (state) onStateChange(state);
              }}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Select District*</Text>
            <Selector
              title="Select district*"
              value={selectedDistrict?.districtName || ""}
              options={districtOptions.map((d) => ({
                id: d.districtID,
                label: d.districtName,
              }))}
              onSelect={(item) => {
                const district = districtOptions.find(
                  (d) => d.districtID === item.id,
                );
                if (district) onDistrictChange(district);
              }}
              disabled={!selectedState}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>
              {selectedState &&
              (selectedState.stateID === 28 || selectedState.stateID === 36)
                ? "Select ASD*"
                : "Select Block*"}
            </Text>
            <Selector
              title={
                selectedState &&
                (selectedState.stateID === 28 || selectedState.stateID === 36)
                  ? "Select ASD*"
                  : "Select block*"
              }
              value={selectedBlock?.label || ""}
              options={blockOptions}
              onSelect={(item) => setSelectedBlock(item)}
              disabled={!selectedDistrict}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Village</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="Village"
              placeholderTextColor={colors.muted}
              maxLength={50}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.floatLabel}>Panchayat</Text>
            <TextInput
              style={styles.input}
              value={panchayat}
              onChangeText={setPanchayat}
              placeholder="Panchayat"
              placeholderTextColor={colors.muted}
              maxLength={50}
            />
          </View>

          <View style={styles.termsRow}>
            <Pressable
              onPress={() => setAcceptedTerms((v) => !v)}
              style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
            >
              {acceptedTerms ? (
                <Text style={styles.checkboxTick}>✓</Text>
              ) : null}
            </Pressable>
            <Text style={styles.termsText}>
              Accept the terms{" "}
              <Text
                style={styles.termsLinkInline}
                onPress={() => navigation.navigate("Terms")}
              >
                terms and conditions
              </Text>
            </Text>
          </View>

          <Pressable style={styles.registerButton} onPress={register}>
            <Text style={styles.registerButtonText}>Register</Text>
          </Pressable>

          <Pressable
            style={styles.backRow}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.backText}>
              <Text style={styles.backPrefix}>Back to </Text>
              <Text style={styles.backLink}>Login</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading ? (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 30,
    flexGrow: 1,
    gap: 12,
  },
  title: {
    textAlign: "center",
    fontFamily: "RobotoMedium",
    fontSize: 24,
    color: colors.darkGreen,
    marginTop: 10,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.lightGreen,
    marginBottom: 8,
  },
  fieldWrap: {
    marginTop: 4,
  },
  floatLabel: {
    alignSelf: "flex-start",
    marginLeft: 22,
    marginBottom: -9,
    zIndex: 1,
    paddingHorizontal: 6,
    backgroundColor: "#fff",
    color: colors.muted,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.text,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorText: {
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.text,
  },
  selectorPlaceholder: {
    color: colors.muted,
  },
  selectorArrowIcon: { width: 21, height: 11 },
  termsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "RobotoMedium",
  },
  termsText: {
    fontFamily: "RobotoRegular",
    color: colors.text,
    fontSize: 14,
  },
  termsLinkInline: {
    fontFamily: "RobotoMedium",
    color: colors.primary,
    textDecorationLine: "underline",
  },
  termsLink: {
    fontFamily: "RobotoMedium",
    color: colors.primary,
    textDecorationLine: "underline",
    fontSize: 14,
  },
  registerButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 22,
    alignItems: "center",
    paddingVertical: 12,
  },
  registerButtonText: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 16,
  },
  backRow: {
    alignItems: "center",
    marginTop: 8,
  },
  backText: {
    color: colors.muted,
    fontFamily: "RobotoMedium",
    fontSize: 14,
  },
  backPrefix: {
    color: colors.muted,
    fontFamily: "RobotoRegular",
  },
  backLink: {
    color: colors.darkGreen,
    fontFamily: "RobotoRegular",
    textDecorationLine: "underline",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000022",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  modalTitle: {
    fontFamily: "RobotoMedium",
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  modalItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  modalItemText: {
    fontFamily: "RobotoRegular",
    color: colors.text,
    fontSize: 14,
  },
});
