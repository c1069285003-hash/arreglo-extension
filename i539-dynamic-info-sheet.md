# I-539 Dynamic Info Sheet / I-539 动态个人信息表

Source: /Users/angielee/Downloads/YiminAPP 2/i539-field-structure.json
Fields: 76

> Preview only. CRM code not modified. / 仅预览，未修改 CRM 代码。

## 资格基础 / What is your current nonimmigrant status? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_gettingStarted_basisOfEligibility_currentNonImmigrantStatus` | 当前非移民身份 | What is your current nonimmigrant status? * | text (68 options) | Yes | Always / 默认显示 | `gettingStarted.basisOfEligibility.currentNonImmigrantStatus` |
| `i539_gettingStarted_basisOfEligibility_currentNonImmigrantStatusExpirationDate` | 当前非移民身份 | When does your current nonimmigrant status expire?: MM/DD/YYYY | date | No | Always / 默认显示 | `gettingStarted.basisOfEligibility.currentNonImmigrantStatusExpirationDate` |
| `i539_gettingStarted_basisOfEligibility_isGrantedDurationOfStatus` | 当前非移民身份 | What is your current nonimmigrant status? * | singleChoice (2 options) | No | Always / 默认显示 | `gettingStarted.basisOfEligibility.isGrantedDurationOfStatus` |
| `i539_gettingStarted_basisOfEligibility_isOnlyApplicant` | 当前非移民身份 | What is your current nonimmigrant status? * | singleChoice (2 options) | No | Always / 默认显示 | `gettingStarted.basisOfEligibility.isOnlyApplicant` |
| `i539_gettingStarted_basisOfEligibility_currentNonImmigrantStatus` | 当前非移民身份 | What is your current nonimmigrant status? * | combobox (68 options) | No | Always / 默认显示 | `gettingStarted.basisOfEligibility.currentNonImmigrantStatus` |

## 申请原因 / What are you applying for? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_gettingStarted_reasonForRequest_requestedDateOfExtension` | 请求身份延长至日期 | What date are you requesting your current or requested status be extended until?: MM/DD/YYYY | date | No | Always / 默认显示 | `gettingStarted.reasonForRequest.requestedDateOfExtension` |
| `i539_gettingStarted_reasonForRequest_applicationType` | 待翻译/确认 | An extension of stay in my current status | singleChoice (2 options) | No | Always / 默认显示 | `gettingStarted.reasonForRequest.applicationType` |

## 代填人与翻译 / Is someone assisting you with completing this application?

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_gettingStarted_preparerAndInterpreterInformation_hasHelper` | 是否有人协助填写申请 | Is someone assisting you with completing this application? | singleChoice (2 options) | No | Yes 会展开代填人/翻译信息 / Yes may reveal preparer/interpreter details | `formikFactoryUIMeta.gettingStarted.preparerAndInterpreterInformation.hasHelper` |

## 姓名 / What is your current legal name?

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_applicant_yourName_name_firstName` | 名 | Given name (first name) | text | No | Always / 默认显示 | `applicant.yourName.name.firstName` |
| `i539_applicant_yourName_name_middleName` | 中间名 | Middle name (if applicable) | text | No | Always / 默认显示 | `applicant.yourName.name.middleName` |
| `i539_applicant_yourName_name_lastName` | 姓 | Family name (last name) * | text | Yes | Always / 默认显示 | `applicant.yourName.name.lastName` |

## 联系方式与地址 / How can we contact you?

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_applicant_yourContactInformation_contactInformation_daytimePhone` | 日间电话 | Daytime telephone number | text | No | Always / 默认显示 | `applicant.yourContactInformation.contactInformation.daytimePhone` |
| `i539_applicant_yourContactInformation_contactInformation_mobilePhone` | 手机号码 | Mobile telephone number | text | No | Always / 默认显示 | `applicant.yourContactInformation.contactInformation.mobilePhone` |
| `i539_applicant_yourContactInformation_contactInformation_emailAddress` | 电子邮箱 | Email address | text | No | Always / 默认显示 | `applicant.yourContactInformation.contactInformation.emailAddress` |
| `i539_applicant_yourContactInformation_mailingAddress_inCareOfName` | 转交收件人 | In care of name (if any) | text | No | Always / 默认显示 | `applicant.yourContactInformation.mailingAddress.inCareOfName` |
| `i539_applicant_yourContactInformation_mailingAddress_addressLineOne` | 地址第一行 | Address line 1 * | text | Yes | Always / 默认显示 | `applicant.yourContactInformation.mailingAddress.addressLineOne` |
| `i539_applicant_yourContactInformation_mailingAddress_addressLineTwo` | 地址第二行 | Address line 2 | text | No | Always / 默认显示 | `applicant.yourContactInformation.mailingAddress.addressLineTwo` |
| `i539_applicant_yourContactInformation_mailingAddress_city` | 城市/镇 | City or town * | text | Yes | Always / 默认显示 | `applicant.yourContactInformation.mailingAddress.city` |
| `i539_applicant_yourContactInformation_mailingAddress_state` | 州 | How can we contact you? | text | Yes | 美国邮寄地址州选择 / U.S. mailing state selector | `applicant.yourContactInformation.mailingAddress.state` |
| `i539_applicant_yourContactInformation_mailingAddress_zipCode` | 邮编 | ZIP code * | text | Yes | Always / 默认显示 | `applicant.yourContactInformation.mailingAddress.zipCode` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_country` | 待翻译/确认 | How can we contact you? | text | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.country` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_addressLineOne` | 地址第一行 | Address line 1 | text | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.addressLineOne` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_addressLineTwo` | 地址第二行 | Address line 2 | text | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.addressLineTwo` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_city` | 城市/镇 | City or town | text | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.city` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_province` | 省/州/地区 | Province | text | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.province` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_postalCode` | 邮政编码 | Postal code | text | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.postalCode` |
| `i539_applicant_yourContactInformation_contactInformation_sameAsDaytimePhone` | 日间电话 | This is the same as my daytime telephone number. | checkbox (1 options) | No | Always / 默认显示 | `formikFactoryUIMeta.applicant.yourContactInformation.contactInformation.sameAsDaytimePhone` |
| `i539_applicant_yourContactInformation_contactInformation_noEmail` | 电子邮箱 | I do not have an email address. | checkbox (1 options) | No | Always / 默认显示 | `formikFactoryUIMeta.applicant.yourContactInformation.contactInformation.noEmail` |
| `i539_applicant_yourContactInformation_isMailingEqualToPhysical` | 待翻译/确认 | How can we contact you? | singleChoice (2 options) | No | 控制美国实际地址是否另填 / Controls whether physical address is separate | `applicant.yourContactInformation.isMailingEqualToPhysical` |
| `i539_applicant_yourContactInformation_mailingAddress_state` | 州 | How can we contact you? | combobox | No | 美国邮寄地址州选择 / U.S. mailing state selector | `applicant.yourContactInformation.mailingAddress.state` |
| `i539_applicant_yourContactInformation_foreignPhysicalAddress_country` | 待翻译/确认 | How can we contact you? | combobox | No | 当需要境外实际地址时显示 / Shows when foreign physical address is needed | `applicant.yourContactInformation.foreignPhysicalAddress.country` |

## 出生信息 / What is your date of birth? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_applicant_whenAndWhereYouWereBorn_dob` | 出生日期 | What is your date of birth?: MM/DD/YYYY | date | Yes | Always / 默认显示 | `applicant.whenAndWhereYouWereBorn.dob` |
| `i539_applicant_whenAndWhereYouWereBorn_birthAddress_country` | 出生日期 | What is your date of birth? * | text | Yes | Always / 默认显示 | `applicant.whenAndWhereYouWereBorn.birthAddress.country` |
| `i539_applicant_whenAndWhereYouWereBorn_birthAddress_country` | 出生日期 | What is your date of birth? * | combobox | No | Always / 默认显示 | `applicant.whenAndWhereYouWereBorn.birthAddress.country` |

## 入境与身份信息 / What is your country of citizenship or nationality? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_countryOfCitizenshipOrNationality` | 国籍/公民身份国家 | What is your country of citizenship or nationality? * | text | Yes | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.countryOfCitizenshipOrNationality` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_dateOfLastArrival` | 州 | When did you last arrive into the United States? | date | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.dateOfLastArrival` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_i94Number` | I-94 到达/离境记录号码 | What is your Form I-94 Arrival-Departure Record Number? | text | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.i94Number` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_passport_number` | 护照号码 | What is the passport number listed on your Form I-94? | text | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.passport.number` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_travelDocumentNumber` | 旅行证件号码 | What is your travel document number? | text | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.travelDocumentNumber` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_countryOfIssuance` | 国籍/公民身份国家 | What is your country of citizenship or nationality? * | text | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.countryOfIssuance` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_expirationDate` | 护照或旅行证件到期日 | What is the expiration date for the passport or travel document on your Form I-94?: MM/DD/YYYY | date | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.expirationDate` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_passport_none` | 护照号码 | I do not have a passport number listed on my Form I-94. | checkbox (1 options) | No | 勾选后通常隐藏/禁用对应号码输入 / Usually disables the related number field | `formikFactoryUIMeta.applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.passport.none` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_noTravelDocumentNumber` | 旅行证件号码 | I do not have a travel document number. | checkbox (1 options) | No | Always / 默认显示 | `formikFactoryUIMeta.applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.noTravelDocumentNumber` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_countryOfCitizenshipOrNationality` | 国籍/公民身份国家 | What is your country of citizenship or nationality? * | combobox | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.countryOfCitizenshipOrNationality` |
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation1_recentEntry_countryOfIssuance` | 国籍/公民身份国家 | What is your country of citizenship or nationality? * | combobox | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation1.recentEntry.countryOfIssuance` |

## 入境与身份信息 / Is your current passport different from the one you used in your most recent entry into the United States?

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_applicant_yourImmigrationInformation_yourImmigrationInformation2_isCurrentPassportDifferent` | 州 | Is your current passport different from the one you used in your most recent entry into the United States? | singleChoice (2 options) | No | Always / 默认显示 | `applicant.yourImmigrationInformation.yourImmigrationInformation2.isCurrentPassportDifferent` |

## 其他号码与学校信息 / What is your A-Number?

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_applicant_otherInformation_alienNumber_number` | A号码 | What is your A-Number? Enter with the first numeric character of your A-Number. | text | No | Always / 默认显示 | `applicant.otherInformation.alienNumber.number` |
| `i539_applicant_otherInformation_socialSecurityNumber_number` | 美国社安号 | What is your U.S. Social Security number? | text | No | Always / 默认显示 | `applicant.otherInformation.socialSecurityNumber.number` |
| `i539_applicant_otherInformation_uscisNumber_number` | USCIS在线账号号码 | What is your USCIS Online Account Number? | text | No | Always / 默认显示 | `applicant.otherInformation.uscisNumber.number` |
| `i539_applicant_otherInformation_schoolName` | A号码 | What is your A-Number? | text | No | Always / 默认显示 | `applicant.otherInformation.schoolName` |
| `i539_applicant_otherInformation_sevisNumber` | SEVIS号码 | What is your Student and Exchange Visitor Information System (SEVIS) Number? (if applicable) | text | No | Always / 默认显示 | `applicant.otherInformation.sevisNumber` |
| `i539_applicant_otherInformation_alienNumber_none` | A号码 | I do not have or know my A-Number. | checkbox (1 options) | No | 勾选后通常隐藏/禁用对应号码输入 / Usually disables the related number field | `formikFactoryUIMeta.applicant.otherInformation.alienNumber.none` |
| `i539_applicant_otherInformation_socialSecurityNumber_none` | 美国社安号 | I do not have or know my U.S. Social Security number. | checkbox (1 options) | No | 勾选后通常隐藏/禁用对应号码输入 / Usually disables the related number field | `formikFactoryUIMeta.applicant.otherInformation.socialSecurityNumber.none` |
| `i539_applicant_otherInformation_uscisNumber_none` | USCIS在线账号号码 | I do not have or know my USCIS Online Account Number. | checkbox (1 options) | No | 勾选后通常隐藏/禁用对应号码输入 / Usually disables the related number field | `formikFactoryUIMeta.applicant.otherInformation.uscisNumber.none` |

## 品格与组织/武装相关问题 / Have you EVER ordered, incited, called for, committed, assisted, helped with, or otherwise participated in acts involving torture or genocide? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage1_hasParticipatedInTortureOrGenocide_question` | 是否参与酷刑或种族灭绝相关行为 | Have you EVER ordered, incited, called for, committed, assisted, helped with, or otherwise participated in acts involving torture or genocide? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage1.hasParticipatedInTortureOrGenocide.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage1_hasParticipatedInKillingAnyPerson_question` | 是否参与酷刑或种族灭绝相关行为 | Have you EVER ordered, incited, called for, committed, assisted, helped with, or otherwise participated in acts involving torture or genocide? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage1.hasParticipatedInKillingAnyPerson.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage1_hasParticipatedInInjuringAnyPerson_question` | 是否参与酷刑或种族灭绝相关行为 | Have you EVER ordered, incited, called for, committed, assisted, helped with, or otherwise participated in acts involving torture or genocide? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage1.hasParticipatedInInjuringAnyPerson.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage1_hasParticipatedInForcedSexualContact_question` | 是否参与酷刑或种族灭绝相关行为 | Have you EVER ordered, incited, called for, committed, assisted, helped with, or otherwise participated in acts involving torture or genocide? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage1.hasParticipatedInForcedSexualContact.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage1_hasParticipatedInDenyingReligiousBeliefs_question` | 是否参与酷刑或种族灭绝相关行为 | Have you EVER ordered, incited, called for, committed, assisted, helped with, or otherwise participated in acts involving torture or genocide? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage1.hasParticipatedInDenyingReligiousBeliefs.question` |

## 品格与组织/武装相关问题 / Have you EVER served in, been a member of, assisted, or participated in any military unit, paramilitary unit, police unit, self-defense unit, vigilante unit, rebel group, guerrilla group, militia, insurgent organization, or any other armed group? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage2_hasServedInMilitary_question` | 是否参与军队/准军事/武装团体 | Have you EVER served in, been a member of, assisted, or participated in any military unit, paramilitary unit, police unit, self-defense unit, vigilante unit, rebel group, guerrilla group, militia, insurgent organization, or any other armed group? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage2.hasServedInMilitary.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage2_hasServedInPrison_question` | 是否参与军队/准军事/武装团体 | Have you EVER served in, been a member of, assisted, or participated in any military unit, paramilitary unit, police unit, self-defense unit, vigilante unit, rebel group, guerrilla group, militia, insurgent organization, or any other armed group? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage2.hasServedInPrison.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage2_hasServedInOrganizationWithWeapons_question` | 是否参与军队/准军事/武装团体 | Have you EVER served in, been a member of, assisted, or participated in any military unit, paramilitary unit, police unit, self-defense unit, vigilante unit, rebel group, guerrilla group, militia, insurgent organization, or any other armed group? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage2.hasServedInOrganizationWithWeapons.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage2_hasTransportedWeapons_question` | 是否参与军队/准军事/武装团体 | Have you EVER served in, been a member of, assisted, or participated in any military unit, paramilitary unit, police unit, self-defense unit, vigilante unit, rebel group, guerrilla group, militia, insurgent organization, or any other armed group? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage2.hasTransportedWeapons.question` |
| `i539_moralCharacter_partyAndGroupAffiliations_partyAndGroupAffiliationsPage2_hasWeaponsTraining_question` | 是否参与军队/准军事/武装团体 | Have you EVER served in, been a member of, assisted, or participated in any military unit, paramilitary unit, police unit, self-defense unit, vigilante unit, rebel group, guerrilla group, militia, insurgent organization, or any other armed group? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.partyAndGroupAffiliations.partyAndGroupAffiliationsPage2.hasWeaponsTraining.question` |

## 移民程序与身份违规 / Have you EVER violated the terms of the nonimmigrant status you now hold? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_moralCharacter_immigrationProceedings_hasViolatedNonImmigrantStatus_question` | 是否违反当前非移民身份条款 | Have you EVER violated the terms of the nonimmigrant status you now hold? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.immigrationProceedings.hasViolatedNonImmigrantStatus.question` |
| `i539_moralCharacter_immigrationProceedings_isInRemovalProceedings_question` | 是否违反当前非移民身份条款 | Have you EVER violated the terms of the nonimmigrant status you now hold? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.immigrationProceedings.isInRemovalProceedings.question` |

## 犯罪与逮捕 / Have you EVER been arrested or convicted of any criminal offense since last entering the United States? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_moralCharacter_crimesAndOffenses_hasBeenArrestedOrConvicted_question` | 州 | Have you EVER been arrested or convicted of any criminal offense since last entering the United States? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `moralCharacter.crimesAndOffenses.hasBeenArrestedOrConvicted.question` |

## 申请请求信息 / Is this application based on an extension or change of status already granted to your spouse, child, or parent?

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage1_isBasedOnGrantedFamilyPetition` | 是否基于亲属已获准延期/转身份 | Is this application based on an extension or change of status already granted to your spouse, child, or parent? | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `yourApplication.informationAboutRequest.informationAboutRequestPage1.isBasedOnGrantedFamilyPetition` |
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage1_basedOnSeparateFamilyPetition` | 待翻译/确认 | Yes, filed with this Form I-539 | singleChoice (3 options) | No | Always / 默认显示 | `yourApplication.informationAboutRequest.informationAboutRequestPage1.basedOnSeparateFamilyPetition` |

## 申请请求信息 / Are you, or any other person included on the application, an applicant for an immigrant visa? *

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage2_isApplicantForImmigrantVisa_question` | 是否为移民签证申请人 | Are you, or any other person included on the application, an applicant for an immigrant visa? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `yourApplication.informationAboutRequest.informationAboutRequestPage2.isApplicantForImmigrantVisa.question` |
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage2_hasImmigrantPetitionBeenFiled_question` | 是否为移民签证申请人 | Are you, or any other person included on the application, an applicant for an immigrant visa? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `yourApplication.informationAboutRequest.informationAboutRequestPage2.hasImmigrantPetitionBeenFiled.question` |
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage2_hasI485BeenFiled_question` | 是否为移民签证申请人 | Are you, or any other person included on the application, an applicant for an immigrant visa? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `yourApplication.informationAboutRequest.informationAboutRequestPage2.hasI485BeenFiled.question` |
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage2_isEmployedInUs_isEmployedInUsQuestion` | 是否为移民签证申请人 | Are you, or any other person included on the application, an applicant for an immigrant visa? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `yourApplication.informationAboutRequest.informationAboutRequestPage2.isEmployedInUs.isEmployedInUsQuestion` |
| `i539_yourApplication_informationAboutRequest_informationAboutRequestPage2_isExchangeVisitorOrDependent_question` | 是否为移民签证申请人 | Are you, or any other person included on the application, an applicant for an immigrant visa? * | singleChoice (2 options) | No | Yes 可能展开解释/详情字段 / Yes may reveal explanation/detail fields | `yourApplication.informationAboutRequest.informationAboutRequestPage2.isExchangeVisitorOrDependent.question` |

## 证据：I-94 / Form I-94, Nonimmigrant Arrival/Departure Record*

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_desktop_drop` | I-94文件上传 | Form I-94, Nonimmigrant Arrival/Departure Record* | file | No | 上传类字段，不用于普通文本 autofill / Upload control, not text autofill | `#desktop-drop` |

## 证据：补充证据 / Additional Evidence You Want To Provide

| CRM Key | 中文字段 | English Field | Type | Required | Dynamic | USCIS name/selector |
|---|---|---|---|---:|---|---|
| `i539_desktop_drop` | 补充证据上传 | Additional Evidence You Want To Provide | file | No | 上传类字段，不用于普通文本 autofill / Upload control, not text autofill | `#desktop-drop` |

## Dropdown Options / 下拉选项

### Current Nonimmigrant Status / 当前非移民身份

| Value | Text |
|---|---|
| `1B1` | 1B1 - H1 B Spec Occ, Singapore/Chile |
| `1B2` | 1B2 - Spec Occ Related To Dod |
| `1B3` | 1B3 - Spec Occ, Fashion Models |
| `1B4` | 1B4 - H 1 B4 Unique Pgm Artist/Ent |
| `1B5` | 1B5 - H 1 B5 Alien Athlete |
| `1BS` | 1BS - Support Person Of H 1 |
| `B1` | B1 - Temporary Visitor For Business (Including Peace Corps). |
| `B1A` | B1A - Ni Persnl/Dom Srvant Of Ni Emp |
| `B1B` | B1B - Ni Domestic Servant Of Usc |
| `B1C` | B1C - Ni Employed By Foreign Airline |
| `B1D` | B1D - Ni Missionaries |
| `B2` | B2 - Temporary Visitor For Pleasure. |
| `CW1` | CW1 - Commonwealth Of Northern Mariana Islands Transitional Worker |
| `CW2` | CW2 - Spouses And Children Of Transitional Workers In Cnmi |
| `E1` | E1 - Treaty Trader, Spouse And Children. |
| `E1S` | E1S - Spouse Of A Treaty Trader |
| `E1Y` | E1Y - Child Of A Treaty Trader |
| `E2` | E2 - Treaty Investor, Spouse And Children. |
| `E2C` | E2C - Commonwealth Of Northern Mariana Islands Investor, Spouse Or Child |
| `E2S` | E2S - Spouse Of Treaty Investor |
| `E2Y` | E2Y - Child Of Treaty Investor |
| `E3` | E3 - Australian Treaty Alien Coming To The United States Solely To Perform Services In A Specialty Occupation |
| `E3D` | E3D - Spouse And Children Of E3 |
| `E3S` | E3S - Spouse Of E3 |
| `E3Y` | E3Y - Child Of E3 |
| `F1` | F1 - Student, Academic Or Language Program. |
| `F2` | F2 - Spouse Or Child Of F 1. |
| `H1C` | H1C - Registered Nurse Who Will Work In Facilities That Serve Health Professional Shortage Areas Under Provisions Of The Nursing Relief For Disadvantage Areas Act Of 1999 |
| `H2A` | H2A - Worker To Perform Agricultural Services Or Labor Of A Temporary Or Seasonal Nature When Services Are Unavailable In The U.S. And Will Not Adversely Affect Wages And Working Conditions Of U.S. Workers. |
| `H2B` | H2B - Nonagricultural Worker Performing Services Of A Temporary Nature Or Labor Unavailable In The United States. |
| `H3` | H3 - Temporary Trainee To Receive Instruction In Any Field Except Medical Education. |
| `H4` | H4 - The Spouse And Children Of An H Nonimmigrant. See 8 Cfr 214.2(h)(9)(Iv). |
| `I` | I - Representative Of Foreign Information Media, Spouse And Children. |
| `J1` | J1 - Exchange Visitor. |
| `J2` | J2 - Spouse Or Child Of J 1. |
| `K3` | K3 - Spouse Of A U.S. Citizen Who Is A Beneficary Of A Petition For Status As The Immediate Relative Of A U.S. Citizen (I 130). |
| `K4` | K4 - Child Accompanying Or Following To Join A K 3 Alien. |
| `L1` | L1 - Intracompany Transferee (Executive, Managerial, And Specialized Personnel Entering To Render Services To A Branch, Parent, Subsidiary, Or Affiliate Of The Company Of Previous Employment Outside The United States). |
| `L1A` | L1A - Manager Or Executive |
| `L1B` | L1B - Specialized Knowledge Alien |
| `L2` | L2 - Spouse Or Child Of L 1. |
| `L2S` | L2S - Spouse Of L1 |
| `L2Y` | L2Y - Child Of L1 |
| `M1` | M1 - Student Pursuing A Full Course Of Study At An Established Vocational Or Other Recognized Nonacademic Institution (Other Than In A Language Training Program). |
| `M2` | M2 - Spouse Or Child Of M1. |
| `N8` | N8 - Parent Of An Alien Classified Sk3 Or Sn3. |
| `N9` | N9 - Child Of N 8 Or Of An Alien Classified Sk1, Sk2, Sk4, Sn1, Sn2, Or Sn4. |
| `O1` | O1 - Temporary Worker With Extraordinary Ability/Achievement In The Sciences, Arts, Education, Business, Or Athletics. |
| `O1A` | O1A - Extraordinary Alien Non Arts |
| `O1B` | O1B - Extraordinary Alien In Arts |
| `O2` | O2 - Temporary Worker Accompanying Or Assisting O 1. |
| `O3` | O3 - Spouse Or Child Of O 1 Or O 2. |
| `P1` | P1 - Temporary Worker, Internationally Recognized Athlete Or Entertainer For A Specific Competition Or Performance. |
| `P1A` | P1A - Alien With Athletic Event |
| `P1B` | P1B - Alien With Entertainment Group |
| `P1S` | P1S - Support Person Of P 1 |
| `P2` | P2 - Temporary Worker, Artist Or Entertainer Under A Reciprocal Exchange Program With A Similar Organization Of A Foreign State. |
| `P2S` | P2S - Support Person Of P 2 |
| `P3` | P3 - Temporary Worker, Artist Or Entertainer Under A Program That Is "Culturally Unique". |
| `P3S` | P3S - Support Person Of P 3 |
| `P4` | P4 - Spouse Or Child Of P 1, P 2, Or P 3. |
| `Q1` | Q1 - Temporary Worker In An International Cultural Exchange Program. |
| `R1` | R1 - Temporary Worker To Perform Work In Religious Occupations. |
| `R2` | R2 - Spouse And Children Of R1. |
| `TD` | TD - Spouse Or Child Of Tn. |
| `TN1` | TN1 - Nafta Principal (Canada) |
| `TN2` | TN2 - Nafta Principal (Mexico) |
| `UU` | UU - Unknown Or Not Reported |