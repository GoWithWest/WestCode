#!/usr/bin/env python3
"""Generate WestCode.xcodeproj, AppIcon, scheme, and zip."""
from __future__ import annotations

import hashlib
import os
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path("/workspace/native/WestCode")
SRC = ROOT / "WestCode"
PROJ = ROOT / "WestCode.xcodeproj"


def uid(name: str) -> str:
    return hashlib.md5(f"WestCode.{name}".encode()).hexdigest()[:24].upper()


SWIFT = [
    "WestCodeApp.swift",
    "Theme.swift",
    "Models.swift",
    "Catalog.swift",
    "Providers.swift",
    "Library.swift",
    "Seed.swift",
    "Prompts.swift",
    "ParseAgent.swift",
    "WestCodeMark.swift",
    "AppState.swift",
    "Runtime/Persistence.swift",
    "Runtime/FilePicking.swift",
    "Runtime/HTTPAgent.swift",
    "Runtime/ACPClient.swift",
    "Runtime/AgentRuntime.swift",
    "Views/ContentView.swift",
    "Views/SidebarView.swift",
    "Views/MosaicView.swift",
    "Views/SessionPane.swift",
    "Views/MessageViews.swift",
    "Views/ComposerView.swift",
    "Views/NewSessionSheet.swift",
    "Views/ProvidersView.swift",
    "Views/LibraryView.swift",
    "Views/OnboardingView.swift",
]


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = max(size * 0.22, 4)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(12, 12, 14, 255))
    w, h = size, size
    width = max(size * 0.07, 1.6)

    def helix(flip: bool, color: tuple[int, int, int, int]):
        pts = []
        steps = max(24, size // 2)
        for i in range(steps + 1):
            t = i / steps
            y = h * (0.16 + 0.68 * t)
            wave = (1 if flip else -1) * (w * 0.22) * (1 if (int(t * 2) % 2 == 0) else -1)
            # smooth sine-like two-lobe
            import math

            x = w * 0.5 + (w * 0.28) * math.sin(t * math.pi * 2) * (1 if flip else -1)
            pts.append((x, y))
        if len(pts) >= 2:
            d.line(pts, fill=color, width=int(width), joint="curve")

    helix(False, (243, 241, 236, 255))
    helix(True, (216, 212, 204, 140))
    return img


def write_icons():
    sizes = {
        16: "icon_16.png",
        32: "icon_32.png",
        64: "icon_64.png",
        128: "icon_128.png",
        256: "icon_256.png",
        512: "icon_512.png",
        1024: "icon_1024.png",
    }
    folder = SRC / "Assets.xcassets" / "AppIcon.appiconset"
    folder.mkdir(parents=True, exist_ok=True)
    for px, name in sizes.items():
        draw_icon(px).save(folder / name, "PNG")
    (folder / "Contents.json").write_text(
        """{
  "images" : [
    { "idiom" : "mac", "size" : "16x16", "scale" : "1x", "filename" : "icon_16.png" },
    { "idiom" : "mac", "size" : "16x16", "scale" : "2x", "filename" : "icon_32.png" },
    { "idiom" : "mac", "size" : "32x32", "scale" : "1x", "filename" : "icon_32.png" },
    { "idiom" : "mac", "size" : "32x32", "scale" : "2x", "filename" : "icon_64.png" },
    { "idiom" : "mac", "size" : "128x128", "scale" : "1x", "filename" : "icon_128.png" },
    { "idiom" : "mac", "size" : "128x128", "scale" : "2x", "filename" : "icon_256.png" },
    { "idiom" : "mac", "size" : "256x256", "scale" : "1x", "filename" : "icon_256.png" },
    { "idiom" : "mac", "size" : "256x256", "scale" : "2x", "filename" : "icon_512.png" },
    { "idiom" : "mac", "size" : "512x512", "scale" : "1x", "filename" : "icon_512.png" },
    { "idiom" : "mac", "size" : "512x512", "scale" : "2x", "filename" : "icon_1024.png" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
""",
        encoding="utf-8",
    )


SHARED = {
    "ALWAYS_SEARCH_USER_PATHS": "NO",
    "CLANG_ANALYZER_NONNULL": "YES",
    "CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION": "YES_AGGRESSIVE",
    "CLANG_CXX_LANGUAGE_STANDARD": '"gnu++20"',
    "CLANG_ENABLE_MODULES": "YES",
    "CLANG_ENABLE_OBJC_ARC": "YES",
    "CLANG_ENABLE_OBJC_WEAK": "YES",
    "COPY_PHASE_STRIP": "NO",
    "DEAD_CODE_STRIPPING": "YES",
    "ENABLE_STRICT_OBJC_MSGSEND": "YES",
    "GCC_C_LANGUAGE_STANDARD": "gnu17",
    "GCC_NO_COMMON_BLOCKS": "YES",
    "GCC_WARN_64_TO_32_BIT_CONVERSION": "YES",
    "GCC_WARN_ABOUT_RETURN_TYPE": "YES_ERROR",
    "GCC_WARN_UNDECLARED_SELECTOR": "YES",
    "GCC_WARN_UNINITIALIZED_AUTOS": "YES_AGGRESSIVE",
    "GCC_WARN_UNUSED_FUNCTION": "YES",
    "GCC_WARN_UNUSED_VARIABLE": "YES",
    "MACOSX_DEPLOYMENT_TARGET": "14.0",
    "SDKROOT": "macosx",
    "SWIFT_VERSION": "5.0",
}

DEBUG_EXTRA = {
    "DEBUG_INFORMATION_FORMAT": "dwarf",
    "ENABLE_TESTABILITY": "YES",
    "GCC_DYNAMIC_NO_PIC": "NO",
    "GCC_OPTIMIZATION_LEVEL": "0",
    "GCC_PREPROCESSOR_DEFINITIONS": '("DEBUG=1","$(inherited)",)',
    "MTL_ENABLE_DEBUG_INFO": "INCLUDE_SOURCE",
    "ONLY_ACTIVE_ARCH": "YES",
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG",
    "SWIFT_OPTIMIZATION_LEVEL": '"-Onone"',
    "MTL_FAST_MATH": "YES",
}

RELEASE_EXTRA = {
    "DEBUG_INFORMATION_FORMAT": '"dwarf-with-dsym"',
    "ENABLE_NS_ASSERTIONS": "NO",
    "MTL_ENABLE_DEBUG_INFO": "NO",
    "MTL_FAST_MATH": "YES",
    "SWIFT_COMPILATION_MODE": "wholemodule",
    "SWIFT_OPTIMIZATION_LEVEL": '"-O"',
}

TARGET_SETTINGS = {
    "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
    "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
    "CODE_SIGN_ENTITLEMENTS": "WestCode/WestCode.entitlements",
    "CODE_SIGN_STYLE": "Automatic",
    "CODE_SIGN_IDENTITY": '"-"',
    "COMBINE_HIDPI_IMAGES": "YES",
    "CURRENT_PROJECT_VERSION": "1",
    "DEVELOPMENT_ASSET_PATHS": '""',
    "ENABLE_APP_SANDBOX": "NO",
    "ENABLE_HARDENED_RUNTIME": "NO",
    "ENABLE_PREVIEWS": "YES",
    "ENABLE_USER_SCRIPT_SANDBOXING": "YES",
    "GENERATE_INFOPLIST_FILE": "YES",
    "INFOPLIST_KEY_CFBundleDisplayName": "WestCode",
    "INFOPLIST_KEY_LSApplicationCategoryType": "public.app-category.developer-tools",
    "INFOPLIST_KEY_NSHumanReadableCopyright": '"Copyright © 2026 WestCode"',
    "LD_RUNPATH_SEARCH_PATHS": '"$(inherited) @executable_path/../Frameworks"',
    "MARKETING_VERSION": "1.0",
    "PRODUCT_BUNDLE_IDENTIFIER": "app.westcode.desktop",
    "PRODUCT_NAME": '"$(TARGET_NAME)"',
    "SWIFT_EMIT_LOC_STRINGS": "YES",
    "SWIFT_STRICT_CONCURRENCY": "minimal",
    "SWIFT_VERSION": "5.0",
    "MACOSX_DEPLOYMENT_TARGET": "14.0",
    "SDKROOT": "macosx",
    "SUPPORTED_PLATFORMS": "macosx",
    "SUPPORTS_MACCATALYST": "NO",
    "SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD": "NO",
}


def settings_block(d: dict, indent: str = "\t\t\t\t") -> str:
    lines = []
    for k, v in d.items():
        lines.append(f"{indent}{k} = {v};")
    return "\n".join(lines)


def write_pbxproj():
    ids = {
        "project": uid("project"),
        "target": uid("target"),
        "mainGroup": uid("mainGroup"),
        "srcGroup": uid("srcGroup"),
        "runtimeGroup": uid("runtimeGroup"),
        "viewsGroup": uid("viewsGroup"),
        "productsGroup": uid("productsGroup"),
        "product": uid("product"),
        "sourcesPhase": uid("sourcesPhase"),
        "frameworksPhase": uid("frameworksPhase"),
        "resourcesPhase": uid("resourcesPhase"),
        "projDebug": uid("projDebug"),
        "projRelease": uid("projRelease"),
        "tgtDebug": uid("tgtDebug"),
        "tgtRelease": uid("tgtRelease"),
        "projCfg": uid("projCfg"),
        "tgtCfg": uid("tgtCfg"),
        "assets": uid("assets"),
        "assetsBuild": uid("assetsBuild"),
        "entitlements": uid("entitlements"),
    }
    file_ids = {}
    build_ids = {}
    for rel in SWIFT:
        file_ids[rel] = uid(f"file.{rel}")
        build_ids[rel] = uid(f"build.{rel}")

    def fileref(rel: str) -> str:
        name = Path(rel).name
        path = name if "/" not in rel else name
        return (
            f"\t\t{file_ids[rel]} /* {name} */ = "
            f"{{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {name}; sourceTree = \"<group>\"; }};"
        )

    file_refs = "\n".join(fileref(r) for r in SWIFT)
    file_refs += f"""
		{ids['product']} /* WestCode.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = WestCode.app; sourceTree = BUILT_PRODUCTS_DIR; }};
		{ids['assets']} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; }};
		{ids['entitlements']} /* WestCode.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = WestCode.entitlements; sourceTree = "<group>"; }};"""

    build_files = "\n".join(
        f"\t\t{build_ids[r]} /* {Path(r).name} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_ids[r]} /* {Path(r).name} */; }};"
        for r in SWIFT
    )
    build_files += f"\n\t\t{ids['assetsBuild']} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {ids['assets']} /* Assets.xcassets */; }};"

    root_swift = [r for r in SWIFT if "/" not in r]
    runtime_swift = [r for r in SWIFT if r.startswith("Runtime/")]
    views_swift = [r for r in SWIFT if r.startswith("Views/")]

    def children(rels):
        return "\n".join(f"\t\t\t\t{file_ids[r]} /* {Path(r).name} */," for r in rels)

    sources_list = "\n".join(
        f"\t\t\t\t{build_ids[r]} /* {Path(r).name} in Sources */," for r in SWIFT
    )

    proj_debug = {**SHARED, **DEBUG_EXTRA}
    proj_release = {**SHARED, **RELEASE_EXTRA}

    pbx = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 56;
	objects = {{

/* Begin PBXBuildFile section */
{build_files}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{file_refs}
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		{ids['frameworksPhase']} /* Frameworks */ = {{
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		{ids['mainGroup']} = {{
			isa = PBXGroup;
			children = (
				{ids['srcGroup']} /* WestCode */,
				{ids['productsGroup']} /* Products */,
			);
			sourceTree = "<group>";
		}};
		{ids['srcGroup']} /* WestCode */ = {{
			isa = PBXGroup;
			children = (
{children(root_swift)}
				{ids['runtimeGroup']} /* Runtime */,
				{ids['viewsGroup']} /* Views */,
				{ids['assets']} /* Assets.xcassets */,
				{ids['entitlements']} /* WestCode.entitlements */,
			);
			path = WestCode;
			sourceTree = "<group>";
		}};
		{ids['runtimeGroup']} /* Runtime */ = {{
			isa = PBXGroup;
			children = (
{children(runtime_swift)}
			);
			path = Runtime;
			sourceTree = "<group>";
		}};
		{ids['viewsGroup']} /* Views */ = {{
			isa = PBXGroup;
			children = (
{children(views_swift)}
			);
			path = Views;
			sourceTree = "<group>";
		}};
		{ids['productsGroup']} /* Products */ = {{
			isa = PBXGroup;
			children = (
				{ids['product']} /* WestCode.app */,
			);
			name = Products;
			sourceTree = "<group>";
		}};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		{ids['target']} /* WestCode */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {ids['tgtCfg']} /* Build configuration list for PBXNativeTarget "WestCode" */;
			buildPhases = (
				{ids['sourcesPhase']} /* Sources */,
				{ids['frameworksPhase']} /* Frameworks */,
				{ids['resourcesPhase']} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = WestCode;
			productName = WestCode;
			productReference = {ids['product']} /* WestCode.app */;
			productType = "com.apple.product-type.application";
		}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		{ids['project']} /* Project object */ = {{
			isa = PBXProject;
			attributes = {{
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
				TargetAttributes = {{
					{ids['target']} = {{
						CreatedOnToolsVersion = 15.0;
					}};
				}};
			}};
			buildConfigurationList = {ids['projCfg']} /* Build configuration list for PBXProject "WestCode" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = {ids['mainGroup']};
			productRefGroup = {ids['productsGroup']} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				{ids['target']} /* WestCode */,
			);
		}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		{ids['resourcesPhase']} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				{ids['assetsBuild']} /* Assets.xcassets in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		{ids['sourcesPhase']} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
{sources_list}
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		{ids['projDebug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings_block(proj_debug)}
			}};
			name = Debug;
		}};
		{ids['projRelease']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings_block(proj_release)}
			}};
			name = Release;
		}};
		{ids['tgtDebug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings_block(TARGET_SETTINGS)}
			}};
			name = Debug;
		}};
		{ids['tgtRelease']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
{settings_block(TARGET_SETTINGS)}
			}};
			name = Release;
		}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		{ids['projCfg']} /* Build configuration list for PBXProject "WestCode" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{ids['projDebug']} /* Debug */,
				{ids['projRelease']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
		{ids['tgtCfg']} /* Build configuration list for PBXNativeTarget "WestCode" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{ids['tgtDebug']} /* Debug */,
				{ids['tgtRelease']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
/* End XCConfigurationList section */
	}};
	rootObject = {ids['project']} /* Project object */;
}}
"""
    (PROJ / "project.pbxproj").write_text(pbx, encoding="utf-8")
    return ids


def write_scheme(target_id: str):
    path = PROJ / "xcshareddata" / "xcschemes" / "WestCode.xcscheme"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1500"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{target_id}"
               BuildableName = "WestCode.app"
               BlueprintName = "WestCode"
               ReferencedContainer = "container:WestCode.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <MacroExpansion>
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "WestCode.app"
            BlueprintName = "WestCode"
            ReferencedContainer = "container:WestCode.xcodeproj">
         </BuildableReference>
      </MacroExpansion>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "WestCode.app"
            BlueprintName = "WestCode"
            ReferencedContainer = "container:WestCode.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "WestCode.app"
            BlueprintName = "WestCode"
            ReferencedContainer = "container:WestCode.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
""",
        encoding="utf-8",
    )


def write_gitignore():
    (ROOT / ".gitignore").write_text(
        "xcuserdata/\nDerivedData/\nbuild/\n*.xcuserstate\n.DS_Store\n",
        encoding="utf-8",
    )


def verify_sources():
    missing = []
    for rel in SWIFT:
        p = SRC / rel
        if not p.exists():
            missing.append(str(p))
        elif p.stat().st_size == 0:
            missing.append(f"{p} (empty)")
    return missing


def zip_project():
    out = Path("/workspace/artifacts/WestCode-macOS.zip")
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in {".git", "xcuserdata", "DerivedData"}]
            for name in filenames:
                if name.endswith(".xcuserstate"):
                    continue
                full = Path(dirpath) / name
                arc = Path("WestCode") / full.relative_to(ROOT)
                z.write(full, arc.as_posix())
    return out


def main():
    missing = verify_sources()
    if missing:
        raise SystemExit("Missing Swift sources:\n" + "\n".join(missing))
    write_icons()
    ids = write_pbxproj()
    write_scheme(ids["target"])
    write_gitignore()
    z = zip_project()
    print("OK", z, z.stat().st_size)


if __name__ == "__main__":
    main()
